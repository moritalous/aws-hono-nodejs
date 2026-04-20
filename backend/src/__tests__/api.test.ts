import { describe, it, expect } from 'bun:test'
import { app } from '../app'

describe('GET /api', () => {
  it('returns 200 with message', async () => {
    const res = await app.request('/api')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ message: 'API is running' })
  })
})

describe('GET /api/hello', () => {
  it('returns 200 with Hello World', async () => {
    const res = await app.request('/api/hello')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ message: 'Hello, World!' })
  })
})

describe('POST /api/chat', () => {
  it('returns 404 for GET requests (POST-only route)', async () => {
    const res = await app.request('/api/chat')
    expect(res.status).toBe(404)
  })

  it('accepts POST with messages array', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })
    // 500 expected when Bedrock not available in test env; confirms route exists
    expect([200, 500]).toContain(res.status)
  })
})
