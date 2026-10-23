import request from 'supertest'
import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { env } from '../../src/config/env.js'
const app = createApp()

describe('HTTP boundaries without database access', () => {
  it('serves liveness', async () => { expect((await request(app).get('/health')).body).toEqual({ ok: true }) })
  it.each(['/api/projects', '/api/reviews', '/api/dashboard', '/api/auth/me'])('requires auth at %s', async (path) => {
    expect((await request(app).get(path)).status).toBe(401)
  })
  it('rejects signed tokens with missing user claims', async () => {
    const token = jwt.sign({}, env.JWT_SECRET)
    expect((await request(app).get('/api/projects').auth(token, { type: 'bearer' })).status).toBe(401)
  })
  it('returns consistent malformed JSON errors', async () => {
    const result = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad')
    expect(result.status).toBe(400)
    expect(result.body.error.code).toBe('INVALID_JSON')
  })
  it('rejects unlisted CORS origins', async () => {
    expect((await request(app).get('/health').set('origin', 'https://untrusted.example')).status).toBe(403)
  })
  it('rejects oversized HTTP bodies', async () => {
    const result = await request(app).post('/api/auth/login').send({ data: 'x'.repeat(2_100_000) })
    expect(result.status).toBe(413)
    expect(result.body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })
})
