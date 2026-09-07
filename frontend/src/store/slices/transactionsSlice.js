import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../api/client'

export const fetchTransactions = createAsyncThunk('transactions/fetch', async () => {
  const res = await api.get('/transactions')
  return res.data
})

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
    dispatch(fetchTransactions())
    return res.data
  }
)

const initialState = {
  items: [],
  loading: false,
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
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false
        state.error = action.error?.message || 'İşlemler alınamadı'
      })
  },
})

export const { clearTransactions } = transactionsSlice.actions
export default transactionsSlice.reducer