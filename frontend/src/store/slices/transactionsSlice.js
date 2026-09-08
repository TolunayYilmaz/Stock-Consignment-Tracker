import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../api/client'
import { logout } from './authSlice'
import { fetchDashboard } from './dashboardSlice'

export const fetchTransactions = createAsyncThunk(
  'transactions/fetch',
  async ({ force, silent } = {}) => (await api.get('/transactions')).data,
  {
    condition: ({ force } = {}, { getState }) => {
      const state = getState().transactions
      if (state.loading) return false
      if (force) return true
      return !state.loaded
    },
  }
)

export const addTransaction = createAsyncThunk(
  'transactions/add',
  async ({ customer_id, type, product_name, quantity, price, date }, { dispatch }) => {
    const payload = {
      customer_id: Number(customer_id),
      type,
      product_name,
      quantity: parseFloat(quantity),
      price: parseFloat(price) || 0,
    }
    if (date) payload.date = new Date(date).toISOString()
    const res = await api.post('/transactions', payload)
    // Optimistic: yeni kaydı anında listeye ekle
    dispatch(transactionsSlice.actions.appendItem(res.data))
    // Sonra arka planda sessizce doğrula + dashboard'u tazele (spinner yok)
    await dispatch(fetchTransactions({ force: true, silent: true }))
    await dispatch(fetchDashboard({ force: true, silent: true }))
  }
)

const initialState = {
  items: [],
  loading: false,
  loaded: false,
  error: '',
}

export const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    appendItem: (state, action) => {
      state.items = [action.payload, ...state.items]
    },
    clearTransactions: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state, action) => {
        if (!action.meta.arg?.silent) state.loading = true
        state.error = ''
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.items = action.payload
        state.loading = false
        state.loaded = true
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false
        state.error = action.error?.message || 'İşlemler alınamadı'
      })
      .addCase('auth/login/fulfilled', () => initialState)
      .addCase(logout.fulfilled, () => initialState)
  },
})

export const { appendItem, clearTransactions } = transactionsSlice.actions
export default transactionsSlice.reducer