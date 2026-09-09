import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api, { getAccessToken } from '../../api/client'

export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  const res = await api.get('/me')
  return res.data
})

export const login = createAsyncThunk('auth/login', async ({ email, password }, { dispatch }) => {
  const res = await api.post('/token', { email, password })
  localStorage.setItem('token', res.data.access_token)
  localStorage.setItem('refresh_token', res.data.refresh_token)
  return await dispatch(fetchMe()).unwrap()
})

export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
})

const initialState = {
  user: null,
  loading: !!getAccessToken(),
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuth: (state) => {
      state.user = null
      state.loading = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload
        state.loading = false
      })
      .addCase(fetchMe.rejected, (state) => {
        if (!localStorage.getItem('token')) {
          state.user = null
        }
        state.loading = false
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload
        state.loading = false
      })
      .addCase(login.rejected, (state) => {
        state.user = null
        state.loading = false
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.loading = false
      })
  },
})

export const { clearAuth } = authSlice.actions
export default authSlice.reducer