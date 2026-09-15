import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { App } from './App'
import { VoteScreen } from './screens/VoteScreen'
import { TvScreen } from './screens/TvScreen'
import { AdminScreen } from './screens/AdminScreen'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('No #root element to mount into.')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          {/* Bare URL lands on the guest experience -- that is what the QR points at. */}
          <Route index element={<VoteScreen />} />
          <Route path="vote" element={<VoteScreen />} />
          <Route path="tv" element={<TvScreen />} />
          <Route path="admin" element={<AdminScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
