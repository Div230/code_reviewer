# Configuration reference

Run backend commands from `backend`, so dotenv reads `backend/.env`. Missing or invalid required configuration prevents startup. Invalid values are reported by field name. Keep configuration files readable only by their operator.

| Variable | Default / requirement | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `PORT` | `3000` | API listener port |
| `DATABASE_URL` | required PostgreSQL URL | Database connection; use a least-privilege role and TLS remotely |
| `JWT_SECRET` | required, at least 32 characters | Random HMAC signing secret; generate with `openssl rand -hex 32`; do not use example values |
| `JWT_EXPIRES_IN` | `7d` | Expiry, integer plus `s`, `m`, `h` or `d` |
| `BCRYPT_ROUNDS` | `12`, range 8–15 | Password hashing cost |
| `CORS_ORIGIN` | local Vite origins | Comma-separated allowed browser origins; set exact production HTTPS origins |
| `REQUEST_BODY_LIMIT` | `2mb` | JSON/form parser byte limit; review content separately limited to 32,000 characters |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Per-process, per-IP global limiter window |
| `RATE_LIMIT_MAX` | `300` | Global requests per window; authentication also limited to 20 requests per 15 minutes |
| `MODEL_API_URL` | `http://localhost:8000/v1/chat/completions` | Trusted HTTP(S) endpoint; embedded URL credentials and query parameters rejected |
| `MODEL_NAME` | `codereviewer` | Must match inference server's served model identifier |
| `MODEL_API_KEY` | unset | Optional inference bearer credential; never put in Vite config |
| `MODEL_TIMEOUT` | `120000` | Fetch and response-body timeout in milliseconds |
| `MODEL_TEMPERATURE` | `0.1` | Model temperature, range 0–2 |
| `MODEL_MAX_TOKENS` | `2048` | Maximum generated tokens; reserve room for prompt within server context |
| `MODEL_MAX_CONCURRENT` | `2`, range 1–64 | In-flight calls per API process; no unbounded queue |
| `MODEL_MAX_RESPONSE_BYTES` | `1000000`, maximum 16000000 | Response-body memory bound |
| `REVIEW_PROMPT_PATH` | empty | Optional trusted administrator-owned prompt file; not user-controlled |

The root `.env` has `POSTGRES_PASSWORD` for local Compose. The database password in `backend/.env` must match it. If using special characters in a database password, URL-encode them in `DATABASE_URL`; the Compose example assumes a URL-safe password.

The frontend `.env` has only `VITE_API_URL` (defaults to `http://localhost:3000`). Set before `npm run build`; changing a server environment variable after building does not change the bundle.

The API does not trust arbitrary proxy headers. With a reverse proxy, configure its forwarding and Express trust settings deliberately; the current default groups proxied clients under the proxy IP for rate limiting. Multiple API replicas need a shared limiter and global GPU admission policy before scaling.
