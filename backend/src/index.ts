import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { resolve, join } from 'path'
import type { Context } from 'hono'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type RouteHandler = (c: Context) => Response | Promise<Response>
type RouteModule = Partial<Record<HttpMethod, RouteHandler>>

const app = new Hono()
app.use('*', cors({ origin: 'http://localhost:3000' }))

const rootDir = resolve(import.meta.dir, '..')
const glob = new Bun.Glob('src/app/**/route.ts')

for await (const file of glob.scan({ cwd: rootDir })) {
  const module = await import(join(rootDir, file)) as RouteModule
  const normalized = file.replaceAll('\\', '/')
  const routePath = normalized.replace(/^src\/app/, '').replace(/\/route\.ts$/, '') || '/'
  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  for (const method of methods) {
    const handler = module[method]
    if (handler) {
      app[method.toLowerCase() as Lowercase<HttpMethod>](routePath, handler)
    }
  }
}

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`)
})
