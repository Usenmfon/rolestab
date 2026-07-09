import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../index.css'
import App from './App'

const platform = window.rolesTab?.app.platform

if (platform) {
  document.documentElement.dataset.platform = platform
  document.documentElement.classList.toggle('platform-darwin', platform === 'darwin')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
