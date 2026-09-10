import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import LivingWorldOverlay from './LivingWorldOverlay.jsx'
import './three-world.css'
import './three-world-hotfix.css'
import './three-world-natural.css'
import './living-coast.css'
import './living-world-overlay.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <LivingWorldOverlay />
  </React.StrictMode>,
)
