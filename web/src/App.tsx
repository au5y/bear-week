import { Outlet } from 'react-router-dom'

import { DisclosureBanner } from './components/Disclosure'

/** Shell shared by every screen: the AI-disclosure banner sits above all of them. */
export function App() {
  return (
    <div className="app">
      <DisclosureBanner />
      <div className="app__body">
        <Outlet />
      </div>
    </div>
  )
}
