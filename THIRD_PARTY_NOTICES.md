# Third-party notices

The Apache-2.0 license at the root applies to this project's own source. Package installation does not transfer ownership of third-party code, and this repository's license does not relicense datasets, checkpoints, or derived model artifacts.

| Component | Upstream / terms |
| --- | --- |
| Qwen2-1.5B-Instruct | [Model and Apache-2.0 license](https://huggingface.co/Qwen/Qwen2-1.5B-Instruct/blob/main/LICENSE); obtain separately and preserve its notices when distributing derivatives |
| Historical github-codereview dataset | [Dataset card](https://huggingface.co/datasets/ronantakizawa/github-codereview), marked `other`; underlying repositories and review content may have separate terms; redistribution permission is not established |
| React / Express / Vite / Prisma / other npm packages | See each installed package's license and the `license` fields of the committed npm lockfiles; transitive dependencies retain their own notices |
| Unsloth / Transformers / TRL / PEFT / Datasets / Accelerate | External training dependencies; see installed distribution metadata and upstream licenses |
| PyTorch / bitsandbytes / W&B | External runtime/training dependencies with their own licenses and transitive notices |
| vLLM | [Upstream project](https://github.com/vllm-project/vllm); separately installed serving dependency, not bundled |

No dependencies are vendored, and no downloaded dataset examples, trained adapters, tokenizers or model binaries are included. Package license metadata is an inventory aid, not a complete legal review. If distributing built bundles, containers or model derivatives, retain the notices and obligations of everything packaged inside them. Operator-supplied datasets/models require a separate rights assessment. The release replaces the inherited starter favicon with a simple project-owned code mark; no third-party icon library is bundled.

Historical dataset citation: Ronan Takizawa, `ronantakizawa/github-codereview` on Hugging Face. This attribution records provenance only and does not establish permission to train or redistribute records.
