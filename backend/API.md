# API Contract

Errors use:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request input", "details": {} } }
```

## POST /api/auth/register

Auth: none

Body:

```json
{ "email": "alex@example.com", "name": "Alex Johnson", "password": "choose-a-unique-password" }
```

Response `201`:

```json
{ "user": { "id": "...", "email": "alex@example.com", "name": "Alex Johnson" }, "token": "..." }
```

Errors: `VALIDATION_ERROR`, `CONFLICT`

## POST /api/auth/login

Auth: none

Body:

```json
{ "email": "alex@example.com", "password": "choose-a-unique-password" }
```

Response `200`: same as register.

Errors: `VALIDATION_ERROR`, `AUTHENTICATION_ERROR`

## GET /api/auth/me

Auth: bearer JWT

Response `200`:

```json
{ "user": { "id": "...", "email": "alex@example.com", "name": "Alex Johnson" } }
```

## POST /api/projects

Auth: bearer JWT

Body:

```json
{ "name": "auth-service", "repository": "https://github.com/example/auth-service", "defaultBranch": "main" }
```

Response `201`:

```json
{ "project": { "id": "...", "name": "auth-service", "repository": "...", "defaultBranch": "main" } }
```

## GET /api/projects

Auth: bearer JWT

Response `200`:

```json
{ "items": [] }
```

## GET /api/projects/:id

Auth: bearer JWT

Response `200`:

```json
{ "project": {} }
```

Errors: `NOT_FOUND`

## PATCH /api/projects/:id

Auth: bearer JWT

Body: any subset of `name`, `repository`, `defaultBranch`.

Response `200`:

```json
{ "project": {} }
```

## DELETE /api/projects/:id

Auth: bearer JWT

Response `204`

## POST /api/reviews

Auth: bearer JWT

Body:

```json
{
  "projectId": "...",
  "inputType": "diff",
  "content": "diff --git ...",
  "language": "typescript",
  "commitSha": "abc123",
  "pullRequestNumber": 142
}
```

Response `201`:

```json
{ "review": { "id": "...", "status": "COMPLETED", "score": 82, "findings": [] } }
```

Errors: ownership/input failures use standard HTTP errors. Inference errors, including timeout, busy model, unavailability and invalid output, are persisted as `review.status=FAILED` with a safe `errorMessage`; creation still returns HTTP 201.

## GET /api/reviews

Auth: bearer JWT

Query:

- `page`
- `limit`
- `search`
- `projectId`
- `status`: `PENDING`, `ANALYZING`, `COMPLETED`, `FAILED`
- `severity`: `CRITICAL`, `WARNING`, `INFO`, `SUGGESTION`
- `sort`: `createdAt:desc`, `createdAt:asc`, `score:desc`, `score:asc`

Response `200`:

```json
{
  "items": [],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

## GET /api/reviews/:id

Auth: bearer JWT

Response `200`:

```json
{ "review": {} }
```

## DELETE /api/reviews/:id

Auth: bearer JWT

Response `204`

## GET /api/dashboard

Auth: bearer JWT

Response `200`:

```json
{
  "reviewsPerformed": 24,
  "averageScore": 83,
  "criticalIssues": 18,
  "issuesResolved": 156,
  "recentReviews": [],
  "issuesByCategory": {
    "SECURITY": 38,
    "PERFORMANCE": 42,
    "CORRECTNESS": 36,
    "CODE_QUALITY": 28,
    "MAINTAINABILITY": 12
  },
  "scoreTrend": []
}
```


## Limits and scoring

Review `content` must contain nonblank text and is limited to 32,000 characters (migration from the earlier 2,000,000-character ceiling to limit inference resource use). The parser defaults to a 2 MB HTTP body limit. Register passwords require 8–72 characters and at most 72 UTF-8 bytes; existing hashes remain valid for login. Global request limits and a separate auth limiter return `429` with the standard error envelope. Body syntax errors return `400`, oversized bodies `413`, and disallowed browser origins `403`.

Scores are computed by the backend, not accepted from the model. See `src/services/scoring.service.ts`. They are heuristic severity penalties, not accuracy or security metrics. There is no finding-resolution mutation API despite the persisted `resolved` field.

`GET /health` is unauthenticated liveness and returns `{ "ok": true }`. It does not check model/database readiness. All project/review/dashboard routes require a valid bearer token. Deleting a project cascades its reviews and findings. The `file` input type contains pasted text in JSON; no filesystem paths are opened and there is no multipart upload endpoint.
