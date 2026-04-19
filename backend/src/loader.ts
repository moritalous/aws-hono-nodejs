import { Hono } from 'hono'
import type { Context } from 'hono'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type RouteHandler = (c: Context) => Response | Promise<Response>
type RouteModule = Partial<Record<HttpMethod, RouteHandler>>

export async function loadRoutes(app: Hono): Promise<void> {
  const modules = import.meta.glob('./app/**/route.ts', { eager: true }) as Record<string, RouteModule>

  for (const [filePath, module] of Object.entries(modules)) {
    // ./app/api/users/route.ts -> /api/users
    const routePath = filePath
      .replace(/^\.\/app/, '')
      .replace(/\/route\.ts$/, '') || '/'

    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    for (const method of methods) {
      const handler = module[method]
      if (handler) {
        app[method.toLowerCase() as Lowercase<HttpMethod>](routePath, handler)
      }
    }
  }
}
