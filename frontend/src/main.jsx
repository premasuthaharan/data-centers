import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Embed from './components/Embed.jsx'

// ?embed=<id> renders just that facility's stat card, standalone, for
// iframe embedding — bypasses the full app shell (map, toolbar, nav)
// entirely rather than mounting it hidden inside App.
const embedFacilityId = new URLSearchParams(window.location.search).get('embed')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {embedFacilityId ? <Embed facilityId={embedFacilityId} /> : <App />}
  </StrictMode>,
)
