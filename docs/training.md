# Training and reproducibility

## Verified configuration

The default source path uses `Qwen/Qwen2-1.5B-Instruct`, Transformers, bitsandbytes 4-bit NF4 loading with double quantization, PEFT LoRA and TRL supervised fine-tuning. The historical Unsloth loader remains a separate explicit backend. The checked-in `configs/train.json` is authoritative for the release command. No weights or downloaded tokenizer files are included.

| Setting | Value |
| --- | --- |
| Context length | 1024 tokens |
| LoRA rank / alpha / dropout | 16 / 16 / 0.0 |
| Targets | q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj |
| Backend / bias / gradient checkpointing | peft / none / standard |
| Epochs | 3 |
| Microbatch / accumulation | 1 / 16 |
| Effective batch | 16 on one device; multiplied by distributed world size |
| Learning rate / weight decay | 2e-4 / 0.01 |
| Scheduler / warmup ratio | cosine / 0.03 |
| Optimizer | adamw_torch, now explicit (historical Trainer default) |
| Precision | BF16 on, FP16 off; BF16-capable GPU required for this config |
| Seed | 42 for preprocessing, model/LoRA and trainer |
| Evaluation / save cadence | every 500 steps |
| Logging / retained checkpoints | every 10 steps / 3 |
| Reporting | none by default; explicit wandb opt-in |

The previous source printed 2048 in experiment metadata while configuring 1024 and did not explicitly pass the limit into TRL. The release aligns both model and trainer at 1024. This fixes a reproducibility defect and can change truncation relative to runs using an implicit TRL default. No historical checkpoint's effective settings or metrics are asserted.

## Data and provenance

Historical notebooks downloaded `ronantakizawa/github-codereview`, capped `comment_type=none` at 29,051, selected up to 50,000 shuffled examples, kept diff/comment/language/type fields and formatted one GitHub-style comment. They did not preserve a complete reproducible provenance manifest. The dataset card currently marks the license as `other`. Establish permission for both records and underlying repository code before using it; neither a public URL nor this project's Apache license establishes those rights.

The release's script accepts **local JSONL** with `diff_context`, `reviewer_comment`, `language`, and `comment_type`. Supported comment types: none, bug, suggestion, question, refactor, performance, security, style, nitpick. It does not download data. Names and repository metadata are dropped; arbitrary private content inside diff/comment text still requires operator review.

```bash
python -m src.training.preprocess --input YOUR_LICENSED_RAW.jsonl --output datasets --seed 42 --limit 50000 --none-limit 29051
```

Choose a new output directory; the script refuses to overwrite existing data. It produces `train_50k.jsonl`, `val.jsonl`, `test.jsonl` and count/seed/input-hash metadata. The legacy split names are retained even when fewer than 50k examples are present. The none cap is a count, not a promise of a 10% class ratio. The notebook's exact old dataset cannot be reconstructed from source alone.

The script deduplicates identical user prompts before splitting approximately 96/2/2 (rounded, at least one row per holdout). The split algorithm is now Python's seeded shuffle; it is not byte-identical to the old Hugging Face split. Related PRs/repositories may still cross splits: this is not a repository-disjoint evaluation. For trustworthy quality evaluation, curate a separately licensed repository-disjoint holdout and a human-reviewed evaluation rubric.

`load_datasets()` accepts either these JSONL files or legacy Hugging Face `save_to_disk` directories (`train_50k`, `val`, `test`) under the configured dataset root. It validates messages, rejects reserved Qwen chat tokens and duplicate user inputs across splits, and strips unrelated columns. The public CPU tests use entirely synthetic strings.

## Backend and dependency migration

The original and initial release-candidate stack used Unsloth. The initial lock produced 15 pip-audit advisories. Even Unsloth 2026.10.7 declares `datasets<5.0.0`, while the dataset path-traversal fix starts at 5.0.1. The default environment therefore now uses native Transformers + PEFT rather than forcing incompatible metadata or suppressing advisories. See [upstream Unsloth constraints](https://github.com/unslothai/unsloth/blob/main/pyproject.toml) and [the advisory](https://osv.dev/vulnerability/PYSEC-2026-3716).

`configs/train.json` explicitly selects `model.backend=peft` and standard gradient checkpointing. The base model, sequence length, rank/alpha/targets, batch/accumulation, learning rate, warmup ratio, epochs, seed and reporting settings are preserved. Kernel implementations and loader behavior differ; historical checkpoints/losses are not asserted to reproduce bit-for-bit. Current Transformers represents a fractional warmup as `warmup_steps=0.03`; the trainer maps the existing `warmup_ratio` config accordingly and keeps compatibility with the older argument when present.

To retain the historical backend, set `model.backend=unsloth` and optionally `model.use_gradient_checkpointing=unsloth` in a separate config/environment. This loader is retained and mock-tested, but Unsloth is deliberately absent from the audited default lock. Do not install it over this environment: its current dataset constraints conflict with it. No currently audited Unsloth environment is supplied or claimed. The backend fails with an explicit explanation when the optional package is absent. No vulnerable legacy lock is shipped as an approved alternative.

## Environment

Use a separate Linux CUDA Python 3.12 environment for training; the source also targets Python 3.11, but the supplied resolution and local validation use 3.12. `requirements-training.in` pins direct dependencies, including a security floor for fsspec. `requirements-training.txt` pins and hashes the full resolved GPU candidate environment. The current lock passes pip-audit; that does not establish CUDA runtime compatibility or absence of every vulnerability. No full GPU environment, Unsloth runtime or real model training was installed/run for this repair.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --require-hashes -r requirements-training.txt
python -m pip check
python -m src.training.train --config configs/train.json --validate-only
python -m src.training.train --config configs/train.json
```

The default GPU candidate pins torch 2.14.1, transformers 5.20.2, TRL 1.16.0, PEFT 0.21.2, datasets 5.1.0, fsspec 2026.7.0, accelerate 1.15.0 and bitsandbytes 0.50.2. W&B remains at 0.27.0. Review GPU driver/CUDA compatibility before installing the GPU stack. The bitsandbytes path selects BF16 or FP16 compute according to hardware capability and fails before model acquisition if no CUDA GPU is available.

GPU memory depends on architecture, kernels, padding, sequence lengths and optimizer. Four-bit weights do not make training CPU-only. No measured minimum VRAM is claimed. The default training precision is BF16 and requires appropriate hardware; explicitly edit precision settings for a different GPU. Do not mix serving dependencies into this environment.

For CPU-only interface verification, use a separate environment and the hashed CPU lock:

```bash
python3.12 -m venv .venv-cpu
source .venv-cpu/bin/activate
python -m pip install --require-hashes -r requirements-cpu.txt
python -m pip check
python -m unittest discover -s tests -v
HF_HUB_OFFLINE=1 python -m scripts.check_training_cpu
```

Both the input and generated CPU requirements declare PyTorch's official CPU index. The file therefore installs with plain `pip install -r requirements-cpu.txt`, without a hidden command-line index flag. That index supplies the pinned `+cpu` PyTorch distribution; hashes restrict the accepted wheels. No CUDA libraries, downloaded models or external datasets are needed. The optional forward smoke constructs and briefly saves/reloads a tiny random model inside a temporary directory, exercises the real native PEFT loader and LoRA attachment, then verifies a finite loss without an optimizer step.

Regenerate the locks from repository root with `uv pip compile requirements-training.in --python-version 3.12 --generate-hashes -o requirements-training.txt` and `uv pip compile requirements-cpu.in --torch-backend cpu --index-strategy unsafe-best-match --python-version 3.12 --generate-hashes --emit-index-url -o requirements-cpu.txt`, then rerun both audits and the CPU checks. Do not solve future advisories by adding ignore flags or silently forcing incompatible dependencies.

## Running and evaluation

Configuration keys are strict. Relative data/output paths resolve against the JSON config file, not a private filesystem path. CLI help and `--validate-only` import no GPU libraries and load no models. Training requires an explicitly permitted dataset and network/model access or a trusted local base-model path.

The custom chat template is saved in the tokenizer. The collator matches the full assistant header, masks user/system/padding tokens and supervises assistant content. Truncated examples with no assistant content fail instead of silently producing all-masked losses. This is a justified correction to the previous single-token membership check; previous and new training losses are not directly comparable.

Resume explicitly with `--resume PATH_TO_CHECKPOINT`. Nonempty output directories require explicit resume to prevent accidental overwrite. No automatic best-checkpoint selection occurs: training saves the final adapter/tokenizer and reports final validation/test loss in `evaluation.json`. Periodic checkpoints are retained up to the configured limit. Loss is not code-review accuracy; no hallucination, recall, or benchmark score has been established.

Training no longer dumps tokenized records or sample completions to stdout/W&B. To opt into numeric metric reporting, set `training.report_to` to `wandb` and configure W&B independently. Review provider logging and retention settings before processing sensitive data.

## Merging and local inference

```bash
python -m src.merge --adapter outputs/qwen2-1.5B-codereviewer --output models/codereviewer-merged
python -m src.inference.inference --model outputs/qwen2-1.5B-codereviewer --max-seq-length 1024
```

Merging requires more memory than quantized training, loads a non-quantized BF16 base, and preserves the adapter's tokenizer/chat template. Only trusted local safetensors adapters should be used. A merged export remains private until data/model licensing and quality are independently resolved. Local interactive inference emits a comment; the web API additionally requires structured JSON serving.


## Optional CPU interface smoke test

`python -m scripts.check_training_cpu` constructs a tiny randomly initialized Qwen2 model and an entirely local synthetic tokenizer, then exercises real dataset preprocessing, TRL, collator labels and a single finite-loss forward pass. It never downloads a tokenizer/model, never performs an optimizer step and does not validate Unsloth or CUDA. The synthetic model and tokenizer are saved/reloaded only inside a temporary directory to exercise the actual safe local-loading code. The regular unittest suite additionally checks model-loading arguments using a mocked Unsloth interface. GPU initialization and fine-tuned review quality remain unverified.

For a reproducible model acquisition, pin an exact model revision in a local model snapshot and set `model_name` to that snapshot. The default remote model name has no pinned revision; historical model/data snapshot hashes were not recorded, so bit-for-bit reproduction of earlier checkpoints is not possible from this source alone.
