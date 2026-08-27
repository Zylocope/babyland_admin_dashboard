import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Serves api/chat.js in `npm run dev` the same way Vercel serves it in prod.
// ponytail: no module reload — restart the dev server after editing api/chat.js.
const devApi = () => ({
  name: 'dev-api',
  configureServer(server) {
    server.middlewares.use('/api/chat', async (req, res, next) => {
      const { default: handler } = await import('./api/chat.js')
      handler(req, res).catch(next)
    })
  },
})

export default defineConfig(({ mode }) => {
  // GEMINI_API_KEY stays un-prefixed so Vite never bundles it into the client.
  Object.assign(process.env, loadEnv(mode, process.cwd(), 'GEMINI_'))
  return { plugins: [react(), tailwindcss(), devApi()] }
})
