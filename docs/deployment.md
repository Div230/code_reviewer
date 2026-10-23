# Deployment and operations

The default quick start runs a loopback-only database, a host API and the Vite dev frontend. It is a development setup. Production needs a TLS reverse proxy, static frontend hosting, explicit secrets, protected PostgreSQL, and a private model service.

## Database

Apply the checked-in migration from `backend` using `npm run db:deploy` before starting an upgraded API. `db:migrate` is for developer-authored schema changes, not deployment. Do not seed public demo accounts. Use a least-privilege database role, encrypted backups and tested restore procedures. Database rows contain submitted code and model findings; deletion cascades through review findings. No automatic retention scheduler exists.

## Build

```bash
cd backend
npm ci
npm run db:generate
npm run build
npm start
cd ../frontend
npm ci
npm run build
```

Serve `frontend/dist` through a static server; configure `VITE_API_URL` before the build. Restrict CSP/connect-src to your API origin. `/health` is liveness only, not a model/database readiness probe. The API establishes a database connection before listening; database startup failures exit without printing connection credentials.

## Backend container

The Dockerfile uses a Node 22 Debian build/runtime image, generates Prisma before packaging, prunes dev dependencies and runs as the node user. `.dockerignore` excludes environment files and local dependencies. Image tags are versioned, but not digest-pinned; resolve and record digests for a deployment. No working Docker daemon was available for the local release audit, so Docker build/runtime validation is delegated to CI and remains distinct from local Node verification.

```bash
docker build -t codereviewer-backend:local backend
```

Compose's optional app profile uses `backend/.env`. Migrate using the host command first, then:

```bash
docker compose --profile app up -d --build
```

Provide `POSTGRES_PASSWORD` in the root `.env`; Compose refuses a missing value. Ensure `backend/.env` has the correct model endpoint and JWT secret. PostgreSQL/API ports in the example bind to loopback. Existing database volumes preserve their initial password; changing environment variables does not rotate a database role password.

## Security and capacity

Use exact HTTPS CORS origins, unique random JWT/database credentials, and an authenticated model endpoint on a private network. Public self-registration is implemented; restrict access at your proxy if this is not desired. The in-memory IP and concurrency limiters are per process. There is no shared quota, durable queue, or multi-replica GPU coordination. Configure ingress body/time limits and set proxy timeouts longer than the model timeout plus database work.

JWTs are stored in browser localStorage and sent as Bearer tokens. Logout removes the local copy but does not revoke it server-side; expiry and signing-key rotation are the available invalidation boundaries. Do not host untrusted scripts on the application origin. Passwords are limited to 72 UTF-8 bytes at registration to avoid bcrypt truncation collisions.

Never enable code/body logging at the proxy or inference layer. A deployment operator must choose a retention policy and provide users with its terms. See [SECURITY.md](../SECURITY.md).
