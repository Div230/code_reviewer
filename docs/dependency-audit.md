# Training dependency audit — release blocker

The Python 3.12 candidate lock was checked with pip-audit 2.9.0 on 2026-10-23 (local date). It reports **15 advisories across 5 packages**. These are unresolved; this audit intentionally fails the CI dependency gate. Package metadata compatibility does not imply vulnerability clearance.

| Package | Locked version | Advisory | Listed fixes |
| --- | --- | --- | --- |
| accelerate | 1.13.0 | PYSEC-2026-3804 | No fixed version listed by scanner |
| datasets | 4.3.0 | PYSEC-2026-3716 | 5.0.1 |
| fsspec | 2025.9.0 | PYSEC-2026-4217 | 2026.6.0 |
| torch | 2.10.0 | PYSEC-2026-139 | No fixed version listed by scanner |
| torch | 2.10.0 | GHSA-rrmf-rvhw-rf47 | 2.13.0 |
| transformers | 4.56.2 | PYSEC-2025-217 | No fixed version listed by scanner |
| transformers | 4.56.2 | PYSEC-2025-214 | No fixed version listed by scanner |
| transformers | 4.56.2 | PYSEC-2025-218 | No fixed version listed by scanner |
| transformers | 4.56.2 | PYSEC-2025-215 | No fixed version listed by scanner |
| transformers | 4.56.2 | PYSEC-2025-216 | No fixed version listed by scanner |
| transformers | 4.56.2 | PYSEC-2026-2290 | No fixed version listed by scanner |
| transformers | 4.56.2 | PYSEC-2026-2288 | 5.0.0 |
| transformers | 4.56.2 | PYSEC-2026-2289 | 5.3.0 |
| transformers | 4.56.2 | PYSEC-2026-3929 | 5.10.0 |
| transformers | 4.56.2 | PYSEC-2026-4174 | No fixed version listed by scanner |

Unsloth 2026.5.5 declares torch <2.11, datasets <4.4 and transformers <=5.5. Some advertised fixes exceed those bounds; other entries have no listed fix. The selected older Transformers pin makes the TRL interface importable, but does not resolve these advisories. Upgrading this interconnected GPU stack requires a supported version matrix, fresh resolution/auditing, CPU checks and a separate CUDA/model smoke test. No advisories have been suppressed.

The web backend and frontend lockfiles separately reported zero npm advisories after remediation. This does not clear the training stack. CVE/OSV data and package availability change over time; rerun both audits before publishing. Scanner matches are evidence of affected-version metadata, not proof every advisory is reachable in this application.
