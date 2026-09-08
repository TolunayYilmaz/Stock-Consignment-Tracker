import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../api/client'
import { logout } from './authSlice'

export const fetchTransactions = createAsyncThunk(
  'transactions/fetch',
  async ({ force } = {}) => (await api.get('/transactions')).data,
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
    await api.post('/transactions', payload)
    await dispatch(fetchTransactions({ force: true }))
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
    clearTransactions: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true
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

export const { clearTransactions } = transactionsSlice.actions
export default transactionsSlice.reducer