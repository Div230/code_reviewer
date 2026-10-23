# Training dependency audit

The original candidate lock reported 15 advisories in five packages. The default lock has now been replaced with a compatible native Transformers/PEFT stack. Both the training lock and CPU test lock report **no known vulnerabilities** in the verification below; no advisory IDs are ignored and CI has no audit `continue-on-error`.

| Package | Previous version | Patched default |
| --- | --- | --- |
| accelerate | 1.13.0 | 1.15.0 |
| datasets | 4.3.0 | 5.1.0 |
| fsspec | 2025.9.0 | 2026.7.0 |
| torch | 2.10.0 | 2.14.1 (2.14.1+cpu for CPU tests) |
| transformers | 4.56.2 | 5.20.2 |

Supporting interfaces were upgraded to TRL 1.16.0, PEFT 0.21.2 and bitsandbytes 0.50.2. W&B remains at 0.27.0. All transitive packages are pinned and hashed. The input explicitly pins fsspec because merely upgrading datasets allowed the resolver to retain its vulnerable older pin.

## Why the backend changed

Unsloth 2026.10.7 still declares datasets <5, conflicting with the [dataset fix starting at 5.0.1](https://osv.dev/vulnerability/PYSEC-2026-3716). Installing patched datasets with forced/ignored dependency metadata would not establish a supported stack. The default backend is now native Transformers + PEFT, keeping Qwen2, 4-bit NF4 loading, LoRA settings and training hyperparameters. An explicit optional Unsloth loader remains in source; no audited Unsloth environment is claimed. See [migration details](training.md#backend-and-dependency-migration).

An empty “Fix Versions” cell in pip-audit does not prove all later releases remain affected; advisory records may use a last-affected range without naming a fixed version. The replacement versions were checked directly rather than assuming the old table made remediation impossible.

## Repeat the checks

```bash
pip-audit -r requirements-training.txt --require-hashes --disable-pip
pip-audit -r requirements-cpu.txt --require-hashes --disable-pip --vulnerability-service osv --strict
```

The first command uses PyPI advisory data. The CPU command uses OSV because PyPI does not index PyTorch's local-version `+cpu` distribution and would otherwise skip it. OSV validates advisory coverage and requires hash presence; it does not validate hash contents. Actual wheel integrity is checked by the CPU installation with `--require-hashes`. The base torch release is additionally audited through the training lock. Both commands passed locally after remediation. The user's original command (`pip-audit -r requirements-training.txt --no-deps --disable-pip`) also exits successfully; its hash guidance is a warning, not the original failure cause.

Local verification also includes an exactly synchronized CPU environment, dependency consistency checking, 12 synthetic tests, real PEFT loading of a locally constructed tiny Qwen2 model, TRL/collator wiring and a finite-loss forward pass. Full CUDA installation, 4-bit execution, real training, model quality and live vLLM serving are not established by these checks. Audit metadata changes over time; rerun checks before publishing or deploying.
