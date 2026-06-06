import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import AppRoutes from './router/index.jsx'
import Cursor from './components/Cursor.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Cursor />
      <AppRoutes />
    </AuthProvider>
  </StrictMode>,
)
