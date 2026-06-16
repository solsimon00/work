import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../tablero_aa.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
