import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../api/client'

export const fetchSales = createAsyncThunk('sales/fetch', async () => {
  const res = await api.get('/sales')
  return res.data
})

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
    dispatch(fetchSales())
    return res.data
  }
)

const initialState = {
  items: [],
  loading: false,
  error: '',
}

export const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    clearSales: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSales.pending, (state) => {
        state.loading = true
        state.error = ''
      })
      .addCase(fetchSales.fulfilled, (state, action) => {
        state.items = action.payload
        state.loading = false
      })
      .addCase(fetchSales.rejected, (state, action) => {
        state.loading = false
        state.error = action.error?.message || 'Satışlar alınamadı'
      })
  },
})

export const { clearSales } = salesSlice.actions
export default salesSlice.reducer