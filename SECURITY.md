# Security policy and boundaries

CodeReviewer treats submitted source and model output as untrusted text. It never executes submitted code, resolves model-produced file paths, clones repositories or invokes shells for reviews. React renders escaped text and the backend validates structured findings. Prisma uses parameterized operations; dashboard SQL uses Prisma bindings.

Authentication uses HS256 JWTs with a required operator-provided secret and bcrypt password hashes. Project/review operations are scoped to the authenticated user; authorization is also retained in mutation queries. There is no account recovery, token revocation, email verification, CSRF cookie authentication or production identity provider integration. Tokens live in localStorage, so an origin compromise can steal them.

The API includes body limits, rate limiting, stricter authentication throttling, configured-origin CORS, helmet headers, inference timeouts, bounded response bodies and bounded concurrent model calls. These are not a substitute for ingress controls or a shared quota across replicas. Code and reviews are persisted in PostgreSQL; the inference provider also receives the submitted text. Logging is limited to operational metadata. Operators must control database access, backups, TLS, inference logs and retention.

Prompt injection can influence findings and scores. The model has no tools or code-execution capability in this application, and its suggestions are not automatically applied. Never execute suggestions without human review. Model output cannot establish that code is safe.

Use trusted safetensors/model sources and keep remote model code loading disabled. Training data can contain secrets and personal data even when publicly accessible. Establish rights, screen data and keep records/checkpoints out of Git. W&B reporting is opt-in and sample text is not logged by the training code.

To report a vulnerability, use GitHub's private vulnerability reporting on the eventual repository if enabled, or a private maintainer contact supplied by its owner. Do not post credentials or submitted code in a public issue. No private contact address is embedded in this release candidate.

Automated scanning checks known patterns and prohibited artifacts; it cannot prove absence of all secrets or vulnerabilities. New dependencies and source changes require renewed review.
