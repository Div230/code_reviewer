# Verification and release status

This is a prepared release candidate, **not approved for public release** while the training dependency vulnerabilities below remain unresolved. No files have been pushed or made public.

| Check | Local result |
| --- | --- |
| Baseline backend | Original 7 unit tests passed; TypeScript build passed; ESLint 9 legacy config failed |
| Baseline frontend | Production build passed; lint scope included dependencies and generated excessive findings |
| Fresh installation | Backend and frontend `npm ci` pass in a clean allowlisted export; both builds and lint pass there |
| Final backend | TypeScript build and ESLint pass; 29 tests pass, including 5 real-PostgreSQL/mock-HTTP-model integration tests |
| Frontend | TypeScript checking, production build and source-scoped lint pass |
| Prisma | Client generation, schema validation and initial migration into a clean local PostgreSQL database pass |
| API startup | Compiled server starts, liveness responds and SIGTERM exits cleanly; missing secret and unavailable database fail safely |
| Python | 11 synthetic unittest tests pass with the optional datasets dependency; minimal Python runs 10 and skips the dataset-dependent test |
| Training interfaces | Strict config parsing, local data loader, mocked Unsloth loading arguments, formatting and assistant loss masking pass |
| Tiny CPU model | Real tokenizer, TRL trainer/dataloader/collator and finite-loss forward pass succeed with a tiny random Qwen2 model; no downloads or optimizer steps |
| Python lint/format/syntax | Ruff and compileall pass |
| npm vulnerability audits | Backend 0; frontend 0 reported advisories after updates |
| Training dependency resolution | Python 3.12 candidate lock resolves successfully; installed private GPU environment was not modified |
| Training vulnerability audit | FAIL: 15 advisories in 5 packages; see [package/advisory inventory](dependency-audit.md) |
| Secret/artifact scanning | Explicit file manifest and common-pattern checks, plus Gitleaks 8.24.3; final export results recorded in the private audit |
| Workflow configuration | Actionlint 1.7.7 passes; workflow/Dependabot/Compose YAML parses; official action commit pins resolved; not executed on GitHub |
| Docker | Docker daemon unavailable; no local image build/runtime validation; CI includes a build check |
| GPU training / real inference | Not run; no full training, checkpoint-quality evaluation or live vLLM serving claim |
| Browser acceptance | No automated real-browser acceptance run; frontend build and API integration evidence are separate |

The CPU forward check used the existing PyTorch/data/TRL installations with temporary compatible Transformers/tokenizers/Hub packages. This is a narrower check than a fresh full GPU dependency installation. The resolved lock contains compatible package metadata, but CUDA kernels, Unsloth model initialization and hardware memory requirements remain unvalidated.

## Publication blockers

1. The candidate training dependency stack has known advisories. Several list no fixed version and some fixes exceed current Unsloth bounds. No findings were suppressed; the CI Python audit gate is expected to fail until a supported, audited stack is established.
2. Obtain a successful run of the committed CI workflows on the final repository before representing them as green. The workflows are prepared and locally inspected, not run on GitHub.

The web source is functional under the tested Node/PostgreSQL environment. It can be evaluated with a separately provided compatible inference service; no trained model is distributed. Live model compatibility/quality, Docker runtime acceptance and production operations remain deployment validation requirements. Historical model/data snapshot provenance and dataset redistribution rights are not established; historical data or checkpoints must not be published on the strength of this source license.
