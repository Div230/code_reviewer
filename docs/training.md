# Training and reproducibility

## Verified configuration

The source uses `Qwen/Qwen2-1.5B-Instruct`, Unsloth `FastLanguageModel`, 4-bit loading, PEFT LoRA and TRL supervised fine-tuning. The checked-in `configs/train.json` is authoritative for the release command. No weights or downloaded tokenizer files are included.

| Setting | Value |
| --- | --- |
| Context length | 1024 tokens |
| LoRA rank / alpha / dropout | 16 / 16 / 0.0 |
| Targets | q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj |
| Bias / gradient checkpointing | none / unsloth |
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

## Environment

Use a separate Linux CUDA Python 3.11/3.12 environment for training. `requirements-training.in` pins the candidate direct stack. `requirements-training.txt` contains a fully resolved Python 3.12 candidate lock. Resolution and a tiny CPU forward pass were checked; full CUDA installation/loading was not. The lock has unresolved security advisories and must not be treated as an approved production environment. See [verification](verification.md). Install a CUDA-compatible PyTorch/Unsloth stack matching the driver and GPU; do not install serving and training dependencies into the same environment.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-training.in
python -m pip check
python -m src.training.train --config configs/train.json --validate-only
python -m src.training.train --config configs/train.json
```

Do not assume the installed private environment is compatible: its Transformers version exceeded the installed Unsloth package's declared upper bound during release inspection. The release candidate pins Transformers 4.56.2 with TRL 0.19.1 instead. Package metadata resolution, imports, CUDA kernels, and actual model loading are separate checks.

GPU memory depends on GPU architecture, kernels, padding, sequence lengths and optimizer. Four-bit base weights reduce memory but do not make the pipeline CPU-only. No measured minimum VRAM is claimed. BF16 requires appropriate hardware; explicitly edit precision settings for a different GPU. First validate with a small permitted dataset and monitor memory before a full run.

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

`python -m scripts.check_training_cpu` constructs a tiny randomly initialized Qwen2 model and an entirely local synthetic tokenizer, then exercises real dataset preprocessing, TRL, collator labels and a single finite-loss forward pass. It never downloads a tokenizer/model, never performs an optimizer step and does not validate Unsloth or CUDA. The regular unittest suite additionally checks model-loading arguments using a mocked Unsloth interface. GPU initialization and fine-tuned review quality remain unverified.

For a reproducible model acquisition, pin an exact model revision in a local model snapshot and set `model_name` to that snapshot. The default remote model name has no pinned revision; historical model/data snapshot hashes were not recorded, so bit-for-bit reproduction of earlier checkpoints is not possible from this source alone.
