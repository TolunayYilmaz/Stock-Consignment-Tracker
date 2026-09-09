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

let isRefreshing = false
let queue = []

function flushQueue(error) {
  queue.forEach((promise) => (error ? promise.reject(error) : promise.resolve()))
  queue = []
}

function tryRefresh(refreshToken) {
  return axios
    .post(`${api.defaults.baseURL}/auth/refresh`, { refresh_token: refreshToken })
    .then((res) => {
      storeTokens(res.data.access_token, res.data.refresh_token)
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

    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Refresh endpoint'inin kendi 401'i veya giriş hatası: asla otomatik refresh deneme
    const url = (originalRequest.url || '')
    if (url.includes('/auth/refresh') || url === '/token') {
      return Promise.reject(error)
    }

    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearTokens()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject })
      }).then(() => api(originalRequest))
    }

    isRefreshing = true
    return tryRefresh(refreshToken)
      .then(() => {
        flushQueue(null)
        return api(originalRequest)
      })
      .catch((refreshErr) => {
        flushQueue(refreshErr)
        clearTokens()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshErr)
      })
      .finally(() => {
        isRefreshing = false
      })
  }
)

export default api
