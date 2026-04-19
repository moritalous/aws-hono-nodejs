import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'
import { loadRoutes } from './loader'

const app = new Hono()

await loadRoutes(app)

export const handler = handle(app)
