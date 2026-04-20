import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { loadRoutes } from './loader'

const app = new Hono()

app.use('*', cors({ origin: 'http://localhost:3000' }))

await loadRoutes(app)

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`)
})
