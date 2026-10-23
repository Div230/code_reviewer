# Verification and release status

This is a prepared release candidate. The previously failing training dependency audit has been repaired with a patched native PEFT default stack. Publication and deployment still require reviewing the final CI results and the runtime validation limits below. This repair does not push or publish anything.

| Check | Local result |
| --- | --- |
| Baseline backend | Original 7 unit tests passed; TypeScript build passed; ESLint 9 legacy config failed |
| Baseline frontend | Production build passed; lint scope included dependencies and generated excessive findings |
| Fresh installation | Backend and frontend `npm ci` pass in a clean allowlisted export; both builds and lint pass there |
| Final backend | TypeScript build and ESLint pass; 29 tests pass, including 5 real-PostgreSQL/mock-HTTP-model integration tests |
| Frontend | TypeScript checking, production build and source-scoped lint pass |
| Prisma | Client generation, schema validation and initial migration into a clean local PostgreSQL database pass |
| API startup | Compiled server starts, liveness responds and SIGTERM exits cleanly; missing secret and unavailable database fail safely |
| Python | 13 synthetic unittest tests pass in the patched CPU environment; minimal Python runs 12 and skips the dataset-dependent test |
| Training interfaces | Strict config parsing, local data loader, native PEFT loading, mocked optional Unsloth loading arguments, formatting and assistant loss masking pass |
| Tiny CPU model | Real tokenizer, TRL trainer/dataloader/collator and finite-loss forward pass succeed with a tiny random Qwen2 model; no downloads or optimizer steps |
| Python lint/format/syntax | Ruff and compileall pass |
| npm vulnerability audits | Backend 0; frontend 0 reported advisories after updates |
| CPU pip installation | Verified in a fresh Python 3.12 environment using only the hash-pinned requirements file; CPU index is embedded in the file |
| Training dependency resolution | Python 3.12 candidate lock resolves successfully; installed private GPU environment was not modified |
| Training vulnerability audit | PASS: no known vulnerabilities in the patched default stack; CPU lock also passes the OSV audit, including its +cpu build; see [audit details](dependency-audit.md) |
| Secret/artifact scanning | Explicit file manifest and common-pattern checks, plus Gitleaks 8.24.3; final export results recorded in the private audit |
| Workflow configuration | Actionlint 1.7.7 passes; workflow/Dependabot/Compose YAML parses; official action commit pins resolved; not executed on GitHub |
| Docker | Docker daemon unavailable; no local image build/runtime validation; CI includes a build check |
| GPU training / real inference | Not run; no full training, checkpoint-quality evaluation or live vLLM serving claim |
| Browser acceptance | No automated real-browser acceptance run; frontend build and API integration evidence are separate |

The repair used a fresh CPU-only Python 3.12 environment synchronized to the hashed CPU lock, and dependency consistency checks pass. The smoke test creates/saves/reloads a tiny synthetic Qwen2 model through the real native PEFT loader, attaches LoRA adapters, and checks the dataloader/collator plus finite-loss forward pass. This is a narrower check than CUDA installation, quantized model loading or full training. Optional Unsloth runtime initialization remains unvalidated.

## Remaining verification

The final workflows must be rerun on GitHub; local results do not prove a GitHub run is green. There are no deliberately failing audit gates or ignored advisories in the updated default stack. Do not claim full GPU training/serving or production acceptance from CPU tests.

The web source is functional under the tested Node/PostgreSQL environment. It can be evaluated with a separately provided compatible inference service; no trained model is distributed. Live model compatibility/quality, Docker runtime acceptance and production operations remain deployment validation requirements. Historical model/data snapshot provenance and dataset redistribution rights are not established; historical data or checkpoints must not be published on the strength of this source license.
