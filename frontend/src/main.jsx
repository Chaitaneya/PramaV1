import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // Disabled StrictMode during testing to avoid double API calls
  // In production, keep StrictMode enabled
  <App />,
)
