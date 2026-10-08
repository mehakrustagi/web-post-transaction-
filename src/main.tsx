import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import MapApp from './MapApp.tsx'
import OrbApp from './OrbApp.tsx'
import TransactionApp from './TransactionApp.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.pathname.startsWith('/transaction') ? (
      <TransactionApp />
    ) : location.pathname.startsWith('/orb') ? (
      <OrbApp />
    ) : location.pathname.startsWith('/map') ? (
      <MapApp />
    ) : (
      <App />
    )}
  </StrictMode>,
)
