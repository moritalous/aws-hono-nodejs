import { streamHandle } from 'hono/aws-lambda'
import { app } from './app'

export const handler = streamHandle(app)
