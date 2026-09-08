import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../api/client'
import { logout } from './authSlice'

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetch',
  async (arg = {}) => (await api.get('/dashboard')).data,
  {
    condition: (arg = {}, { getState }) => {
      const state = getState().dashboard
      if (state.loading) return false
      if (arg.force) return true
      return !state.loaded
    },
  }
)

const initialState = {
  rows: [],
  loading: false,
  loaded: false,
  error: '',
}

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboard: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true
        state.error = ''
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.rows = action.payload
        state.loading = false
        state.loaded = true
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false
        state.error = action.error?.message || 'Özet alınamadı'
      })
      .addCase('auth/login/fulfilled', () => initialState)
      .addCase(logout.fulfilled, () => initialState)
  },
})

export const { clearDashboard } = dashboardSlice.actions
export default dashboardSlice.reducer