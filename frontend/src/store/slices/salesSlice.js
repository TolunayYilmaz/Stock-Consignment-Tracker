import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../api/client'
import { logout } from './authSlice'
import { fetchDashboard } from './dashboardSlice'

export const fetchSales = createAsyncThunk(
  'sales/fetch',
  async ({ force, silent } = {}) => (await api.get('/sales')).data,
  {
    condition: ({ force } = {}, { getState }) => {
      const state = getState().sales
      if (state.loading) return false
      if (force) return true
      return !state.loaded
    },
  }
)

export const addSale = createAsyncThunk(
  'sales/add',
  async ({ customer_name, product_name, quantity, price, date }, { dispatch }) => {
    const payload = {
      customer_name,
      product_name,
      quantity: parseFloat(quantity),
      price: parseFloat(price) || 0,
    }
    if (date) payload.date = new Date(date).toISOString()
    const res = await api.post('/sales', payload)
    // Optimistic: yeni satışı anında listeye ekle
    dispatch(salesSlice.actions.appendItem(res.data))
    // Arka planda sessizce doğrula + dashboard'u tazele (spinner yok)
    await dispatch(fetchSales({ force: true, silent: true }))
    await dispatch(fetchDashboard({ force: true, silent: true }))
  }
)

const initialState = {
  items: [],
  loading: false,
  loaded: false,
  error: '',
}

export const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    appendItem: (state, action) => {
      state.items = [action.payload, ...state.items]
    },
    clearSales: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSales.pending, (state, action) => {
        if (!action.meta.arg?.silent) state.loading = true
        state.error = ''
      })
      .addCase(fetchSales.fulfilled, (state, action) => {
        state.items = action.payload
        state.loading = false
        state.loaded = true
      })
      .addCase(fetchSales.rejected, (state, action) => {
        state.loading = false
        state.error = action.error?.message || 'Satışlar alınamadı'
      })
      .addCase('auth/login/fulfilled', () => initialState)
      .addCase(logout.fulfilled, () => initialState)
  },
})

export const { appendItem, clearSales } = salesSlice.actions
export default salesSlice.reducer