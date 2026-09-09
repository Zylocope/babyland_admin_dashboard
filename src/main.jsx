import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'

// Splitting the build means a route is now fetched on demand, which introduces a
// failure that did not exist with one bundle: a deploy replaces the hashed
// chunks while a tab is still open, and the next navigation requests a file that
// is gone. This shop keeps the app open all day, so that is not a rare case.
// One reload picks up the new build. The timestamp stops a reload loop if the
// chunk is genuinely missing rather than merely stale.
const RELOAD_KEY = 'al_chunk_reload_at';
window.addEventListener('vite:preloadError', (event) => {
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  if (Date.now() - last < 10_000) return;   // already tried; let the error show
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
