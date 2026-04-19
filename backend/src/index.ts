import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { loadRoutes } from './loader'

const app = new Hono()

await loadRoutes(app)

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`)
})
