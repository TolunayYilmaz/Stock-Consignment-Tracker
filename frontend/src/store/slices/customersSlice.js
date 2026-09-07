import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../api/client'

export const fetchCustomers = createAsyncThunk('customers/fetch', async () => {
  const res = await api.get('/customers')
  return res.data
})

export const addCustomer = createAsyncThunk('customers/add', async ({ name }, { dispatch }) => {
  const res = await api.post('/customers', { name: name.trim() })
  dispatch(fetchCustomers())
  return res.data
})

const initialState = {
  items: [],
  loading: false,
  error: '',
}

export const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    clearCustomers: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true
        state.error = ''
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.items = action.payload
        state.loading = false
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false
        state.error = action.error?.message || 'Müşteriler alınamadı'
      })
  },
})

export const { clearCustomers } = customersSlice.actions
export default customersSlice.reducer