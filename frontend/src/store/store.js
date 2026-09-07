import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import customersReducer from './slices/customersSlice'
import transactionsReducer from './slices/transactionsSlice'
import salesReducer from './slices/salesSlice'
import dashboardReducer from './slices/dashboardSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    customers: customersReducer,
    transactions: transactionsReducer,
    sales: salesReducer,
    dashboard: dashboardReducer,
  },
})

export default store