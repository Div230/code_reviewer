# Model serving

## Contract

`ModelClient` calls the configured complete chat-completion URL with `model`, `temperature`, `max_tokens`, a user message containing the review prompt, and `response_format: {type: "json_schema", json_schema: {name: "code_review", schema: ...}}`. This is the [vLLM structured-output interface](https://docs.vllm.ai/en/stable/features/structured_outputs/). The response must have `choices[0].message.content` containing a JSON summary and findings. Fenced JSON is tolerated. Zod enforces enums, string bounds, at most 200 findings, and ordered positive line ranges.

A configurable maximum number of requests is admitted per API process. Fetch/body reading has an abort timeout and a byte ceiling. Empty output, bad JSON, schema failure, transport failure or an unavailable model becomes a persisted failed review. **For compatibility, review creation still returns HTTP 201 with `review.status=FAILED`; clients must inspect that field.** Rejected admission is also stored as a failed review. There is no streaming.

## vLLM example

In a separate GPU serving environment, install a maintained vLLM release compatible with your CUDA driver. Pin and record the chosen version in your deployment. This repository has no tested vLLM GPU environment lock; the examples establish configuration, not successful model-serving validation.

After producing a trusted local merged model as described in [training](training.md):

```bash
vllm serve models/codereviewer-merged --served-model-name codereviewer --host 127.0.0.1 --port 8000 --max-model-len 4096 --gpu-memory-utilization 0.8 --disable-log-requests
```

This 4096-token serving budget is an operator example, not the 1024-token training context or a validated quality setting. The prompt plus generated tokens must fit the serving limit; use small inputs or lower `MODEL_MAX_TOKENS`. The model architecture's supported maximum is not a promise of training quality at long contexts. Memory usage depends on KV cache, concurrency and precision; tune under monitoring. Do not add `--trust-remote-code` for unreviewed models.

Set backend variables:

```dotenv
MODEL_API_URL=http://localhost:8000/v1/chat/completions
MODEL_NAME=codereviewer
MODEL_MAX_TOKENS=2048
MODEL_MAX_CONCURRENT=2
MODEL_TIMEOUT=120000
```

For backend-in-Compose and inference-on-host, set the endpoint to `http://host.docker.internal:8000/v1/chat/completions` and configure the inference listener/firewall to permit only that private connection. The loopback-only example above intentionally does not expose a model server to remote hosts. For a remote server use HTTPS and `MODEL_API_KEY` if supported; never place the credential in a URL or frontend environment.

You may explicitly serve a separately acquired base model to inspect API wiring, but it is not the project's fine-tuned model. Training and serving model artifacts are never downloaded by web installation or CI.

## Important boundaries

- The historical fine-tuning target is a free-text comment, not this JSON review schema. A merged artifact may load successfully and still produce poor findings; evaluate with licensed holdouts before relying on it.
- Request content is not executed, uploaded to arbitrary user-selected URLs, or passed to a shell. Only administrators configure the inference endpoint and optional prompt file.
- A browser disconnect does not cancel inference. The synchronous admitted job continues until completion/timeout to preserve review persistence. A process restart can strand an analyzing review; durable job recovery is not implemented.
- HTTP status errors do not include upstream response bodies in user responses or logs. Submitted code and model completions are not application-logged; configure inference/reverse-proxy logs consistently.
