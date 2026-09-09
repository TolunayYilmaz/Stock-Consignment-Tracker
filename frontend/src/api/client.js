import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

const TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

function storeTokens(accessToken, refreshToken) {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

function isAuthError(error) {
  return !!error.response && [401, 403].includes(error.response.status)
}

function handleRefreshFailure(error) {
  if (isAuthError(error)) {
    clearTokens()
    api.defaults.headers.common.Authorization = ''
    redirectToLogin()
  }
}

let isRefreshing = false
let failedQueue = []

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve()
  })
  failedQueue = []
}

function tryRefresh(refreshToken) {
  return axios
    .post(`${api.defaults.baseURL}/auth/refresh`, { refresh_token: refreshToken })
    .then((res) => {
      storeTokens(res.data.access_token, res.data.refresh_token)
      api.defaults.headers.common.Authorization = `Bearer ${res.data.access_token}`
      return res.data
    })
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const originalRequest = error.config
    const status = error.response && error.response.status

    if (status !== 401 || originalRequest._isRefreshCall) {
      return Promise.reject(error)
    }

    const url = originalRequest.url || ''
    if (url.includes('/auth/refresh') || url === '/token') {
      return Promise.reject(error)
    }

    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearTokens()
      redirectToLogin()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => api(originalRequest))
    }

    isRefreshing = true
    originalRequest._isRefreshCall = true

    return tryRefresh(refreshToken)
      .then(() => {
        processQueue(null)
        return api(originalRequest)
      })
      .catch((refreshErr) => {
        processQueue(refreshErr)
        handleRefreshFailure(refreshErr)
        return Promise.reject(refreshErr)
      })
      .finally(() => {
        isRefreshing = false
      })
  }
)

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const token = getAccessToken()
      const refreshToken = getRefreshToken()
      if (token && refreshToken && !isRefreshing) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const expiresIn = payload.exp * 1000 - Date.now()
          if (expiresIn < 5 * 60 * 1000) {
            isRefreshing = true
            tryRefresh(refreshToken)
              .then(() => processQueue(null))
              .catch((refreshErr) => {
                processQueue(new Error('refresh failed'))
                handleRefreshFailure(refreshErr)
              })
              .finally(() => {
                isRefreshing = false
              })
          }
        } catch {
          // Token decode failed — ignore, will be caught by next request
        }
      }
    }
  })
}

export default api
