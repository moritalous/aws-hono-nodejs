import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { GET as apiGet } from './app/api/route'
import { GET as helloGet } from './app/api/hello/route'
import { POST as chatPost } from './app/api/chat/route'

const app = new Hono()
app.use('*', cors({ origin: 'http://localhost:3000' }))

app.get('/api', apiGet)
app.get('/api/hello', helloGet)
app.post('/api/chat', chatPost)

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`)
})
