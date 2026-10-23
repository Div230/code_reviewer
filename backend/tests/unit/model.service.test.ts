import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModelClient } from '../../src/services/model.service.js'
import { env } from '../../src/config/env.js'

function mockOutput(content: unknown) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }))
}

describe('ModelClient', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

  it('sends the configured model and validates structured output', async () => {
    const fetchMock = vi.fn(async () => mockOutput(JSON.stringify({ summary: 'Synthetic review', findings: [] })))
    vi.stubGlobal('fetch', fetchMock)
    const result = await new ModelClient().reviewCode('synthetic prompt')
    expect(result).toEqual({ summary: 'Synthetic review', findings: [] })
    const options = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(JSON.parse(options.body as string).model).toBe(env.MODEL_NAME)
  })

  it.each(['not json', JSON.stringify({ summary: 'Invalid shape' }), '', 123])('rejects malformed content %s', async (content) => {
    vi.stubGlobal('fetch', vi.fn(async () => mockOutput(content)))
    await expect(new ModelClient().reviewDiff('synthetic')).rejects.toMatchObject({ code: 'INVALID_MODEL_RESPONSE' })
  })

  it('handles server failure without exposing upstream response text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('private upstream error', { status: 500 })))
    await expect(new ModelClient().reviewCode('synthetic')).rejects.toMatchObject({ code: 'MODEL_UNAVAILABLE', statusCode: 502 })
  })

  it('handles unavailable model transport', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    await expect(new ModelClient().reviewCode('synthetic')).rejects.toMatchObject({ code: 'MODEL_UNAVAILABLE' })
  })

  it('aborts on timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })))
    const result = expect(new ModelClient().reviewCode('synthetic')).rejects.toMatchObject({ code: 'MODEL_TIMEOUT' })
    await vi.advanceTimersByTimeAsync(env.MODEL_TIMEOUT + 1)
    await result
  })

  it('caps response bytes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x'.repeat(env.MODEL_MAX_RESPONSE_BYTES + 1))))
    await expect(new ModelClient().reviewCode('synthetic')).rejects.toMatchObject({ code: 'INVALID_MODEL_RESPONSE' })
  })

  it('limits concurrent inference and frees capacity', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    vi.stubGlobal('fetch', vi.fn(async () => { await gate; return mockOutput('{"summary":"ok","findings":[]}') }))
    const client = new ModelClient()
    const pending = Array.from({ length: env.MODEL_MAX_CONCURRENT }, () => client.reviewCode('synthetic'))
    await expect(client.reviewCode('synthetic')).rejects.toMatchObject({ code: 'MODEL_BUSY' })
    release()
    await Promise.all(pending)
    await expect(client.reviewCode('synthetic')).resolves.toHaveProperty('summary', 'ok')
  })
})
