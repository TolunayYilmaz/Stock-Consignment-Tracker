import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'
import { store } from './store/store'
import { fetchMe } from './store/slices/authSlice'
import './index.css'

if (localStorage.getItem('token')) {
  store.dispatch(fetchMe())
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
)