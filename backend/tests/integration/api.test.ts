import request from 'supertest'
import { createServer, type Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { prisma } from '../../src/config/database.js'
import { env } from '../../src/config/env.js'

// Must target a disposable database. These tests create and delete only their own synthetic users.
describe.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('PostgreSQL + HTTP model integration', () => {
  const app = createApp()
  let server: Server
  let mode = 'valid'
  let token = '', otherToken = '', projectId = '', reviewId = ''
  const ids: string[] = []
  const originalUrl = env.MODEL_API_URL
  const email = `synthetic-${crypto.randomUUID()}@example.invalid`
  beforeAll(async () => {
    await prisma.$connect()
    server = createServer(async (req, res) => {
      let body = ''
      for await (const chunk of req) body += chunk
      const payload = JSON.parse(body)
      if (mode === 'offline') { res.writeHead(503); res.end(); return }
      if (mode === 'malformed') { res.setHeader('content-type', 'application/json'); res.end('{bad'); return }
      expect(payload.model).toBe(env.MODEL_NAME)
      expect(payload.response_format.type).toBe('json_schema')
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: 'Synthetic review', findings: [] }) } }] }))
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address() as { port: number }
    env.MODEL_API_URL = `http://127.0.0.1:${address.port}/v1/chat/completions`
  })
  afterAll(async () => {
    env.MODEL_API_URL = originalUrl
    await prisma.user.deleteMany({ where: { id: { in: ids } } })
    await prisma.$disconnect()
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()))
  })
  it('registers, logs in, and hides password hashes', async () => {
    const result = await request(app).post('/api/auth/register').send({ email, name: 'Synthetic User', password: 'synthetic-test-only' })
    expect(result.status).toBe(201)
    expect(result.body.user).not.toHaveProperty('passwordHash')
    ids.push(result.body.user.id)
    const login = await request(app).post('/api/auth/login').send({ email, password: 'synthetic-test-only' })
    expect(login.status).toBe(200)
    token = login.body.token
    const other = await request(app).post('/api/auth/register').send({ email: `other-${email}`, name: 'Other Synthetic', password: 'synthetic-test-only' })
    ids.push(other.body.user.id); otherToken = other.body.token
  })
  it('persists projects and structured reviews through the full API', async () => {
    const project = await request(app).post('/api/projects').auth(token, { type: 'bearer' }).send({ name: 'Synthetic project' })
    expect(project.status).toBe(201); projectId = project.body.project.id
    const result = await request(app).post('/api/reviews').auth(token, { type: 'bearer' }).send({ projectId, inputType: 'code', content: 'const synthetic = 1' })
    expect(result.status).toBe(201)
    expect(result.body.review).toMatchObject({ status: 'COMPLETED', score: 100, summary: 'Synthetic review', findings: [] })
    reviewId = result.body.review.id
    expect((await request(app).get('/api/dashboard').auth(token, { type: 'bearer' })).body.reviewsPerformed).toBe(1)
    expect((await request(app).get('/api/reviews').auth(token, { type: 'bearer' })).body.items).toHaveLength(1)
  })
  it('isolates accounts for reads, writes, deletes, and review creation', async () => {
    for (const path of [`/api/projects/${projectId}`, `/api/reviews/${reviewId}`]) {
      expect((await request(app).get(path).auth(otherToken, { type: 'bearer' })).status).toBe(404)
      expect((await request(app).delete(path).auth(otherToken, { type: 'bearer' })).status).toBe(404)
    }
    expect((await request(app).patch(`/api/projects/${projectId}`).auth(otherToken, { type: 'bearer' }).send({ name: 'stolen' })).status).toBe(404)
    expect((await request(app).post('/api/reviews').auth(otherToken, { type: 'bearer' }).send({ projectId, inputType: 'code', content: 'synthetic' })).status).toBe(404)
  })
  it.each(['offline', 'malformed'])('persists failed review gracefully for %s model', async (nextMode) => {
    mode = nextMode
    const result = await request(app).post('/api/reviews').auth(token, { type: 'bearer' }).send({ projectId, inputType: 'diff', content: '+synthetic' })
    expect(result.status).toBe(201)
    expect(result.body.review.status).toBe('FAILED')
    expect(result.body.review.errorMessage).toMatch(/review model/)
    expect((await request(app).get('/health')).status).toBe(200)
  })
})
