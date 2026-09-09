import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../api/client'
import { logout } from './authSlice'

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetch',
  async ({ year, force, silent } = {}) => {
    const params = {}
    if (year && year !== 'all') params.year = year
    const res = await api.get('/dashboard', { params })
    return res.data
  },
  {
    condition: ({ force } = {}, { getState }) => {
      const state = getState().dashboard
      if (state.loading) return false
      if (force) return true
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
      .addCase(fetchDashboard.pending, (state, action) => {
        if (!action.meta.arg?.silent) state.loading = true
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
