import type { Context } from 'hono'

export const GET = (c: Context) => c.json({ message: 'API is running' })
