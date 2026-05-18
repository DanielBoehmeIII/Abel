import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startSyncWorker } from './lib/syncWorker'
import { validateEnv } from './config/env'
import { installGlobalErrorHandlers } from './lib/analytics'
import ErrorBoundary from './components/system/ErrorBoundary'

validateEnv()
installGlobalErrorHandlers()
startSyncWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
