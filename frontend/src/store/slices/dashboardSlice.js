import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../api/client'

export const fetchDashboard = createAsyncThunk('dashboard/fetch', async () => {
  const res = await api.get('/dashboard')
  return res.data
})

const initialState = {
  rows: [],
  loading: false,
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
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false
        state.error = action.error?.message || 'Özet alınamadı'
      })
  },
})

export const { clearDashboard } = dashboardSlice.actions
export default dashboardSlice.reducer