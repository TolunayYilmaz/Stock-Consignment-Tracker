import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../api/client'
import { logout } from './authSlice'

export const fetchCustomers = createAsyncThunk(
  'customers/fetch',
  async ({ force, silent } = {}) => (await api.get('/customers')).data,
  {
    // Yalnızca daha önce yüklenmemişse veya açıkça force edilmişse API çağır
    condition: ({ force } = {}, { getState }) => {
      const state = getState().customers
      if (state.loading) return false
      if (force) return true
      return !state.loaded
    },
  }
)

export const addCustomer = createAsyncThunk('customers/add', async ({ name }, { dispatch }) => {
  await api.post('/customers', { name: name.trim() })
  await dispatch(fetchCustomers({ force: true, silent: true }))
})

export const deleteCustomer = createAsyncThunk('customers/delete', async (id) => {
  await api.delete(`/customers/${id}`)
  return id
})

const initialState = {
  items: [],
  loading: false,
  loaded: false,
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
      .addCase(fetchCustomers.pending, (state, action) => {
        if (!action.meta.arg?.silent) state.loading = true
        state.error = ''
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.items = action.payload
        state.loading = false
        state.loaded = true
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false
        state.error = action.error?.message || 'Müşteriler alınamadı'
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload)
      })
      .addCase(deleteCustomer.rejected, (state) => {
        state.error = ''
      })
      .addCase('auth/login/fulfilled', () => initialState)
      .addCase(logout.fulfilled, () => initialState)
  },
})

export const { clearCustomers } = customersSlice.actions
export default customersSlice.reducer