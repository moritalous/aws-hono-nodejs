import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { GET as apiGet } from './app/api/route'
import { GET as helloGet } from './app/api/hello/route'
import { POST as chatPost } from './app/api/chat/route'

export const app = new Hono()
app.use('*', cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }))

app.get('/api', apiGet)
app.get('/api/hello', helloGet)
app.post('/api/chat', chatPost)
