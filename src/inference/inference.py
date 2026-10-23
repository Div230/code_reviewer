import argparse
import warnings


warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
    module="transformers.modeling_attn_mask_utils",
)


# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are an experienced software engineer performing GitHub pull "
    "request reviews. Write clear, concise, and actionable review comments "
    "for Git diffs."
)


# ---------------------------------------------------------------------
# Load model
# ---------------------------------------------------------------------

# ---------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------


def generate(
    prompt: str,
    max_new_tokens: int = 256,
    temperature: float = 0.0,
):
    import torch

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": prompt,
        },
    ]

    # Apply the exact chat template used by the model.
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    inputs = tokenizer(
        text,
        return_tensors="pt",
    ).to(model.device)

    if inputs["input_ids"].shape[-1] + max_new_tokens > context_limit:
        raise ValueError("Prompt plus generated tokens exceeds --max-seq-length")
    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            use_cache=True,
            repetition_penalty=1.05,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    input_length = inputs["input_ids"].shape[-1]

    generated_tokens = outputs[0][input_length:]

    response = tokenizer.decode(
        generated_tokens,
        skip_special_tokens=True,
    ).strip()

    return response


# ---------------------------------------------------------------------
# Multiline input
# ---------------------------------------------------------------------


def read_multiline_prompt():
    print()
    print("Paste your Git diff / review prompt.")
    print("Type END on its own line when finished.")
    print()

    lines = []

    while True:
        line = input()

        if line == "END":
            break

        lines.append(line)

    return "\n".join(lines)


# ---------------------------------------------------------------------
# Interactive Chat
# ---------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="Local interactive review using a trusted model")
    parser.add_argument("--model", required=True)
    parser.add_argument("--max-seq-length", type=int, default=1024)
    args = parser.parse_args()
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    global model, tokenizer, context_limit
    context_limit = args.max_seq_length
    tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=False)
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        trust_remote_code=False,
        use_safetensors=True,
        dtype=(torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16)
        if torch.cuda.is_available()
        else torch.float32,
        device_map="auto",
    )
    model.eval()
    print("=" * 60)
    print("Code Reviewer Chat")
    print("Paste multiline input and finish with: END")
    print("Type exit or quit to stop.")
    print("=" * 60)

    while True:
        try:
            prompt = read_multiline_prompt()

            if not prompt.strip():
                continue

            if prompt.strip().lower() in {"exit", "quit"}:
                break

            response = generate(prompt)

            print("\nAssistant:")
            print("-" * 60)
            print(response)
            print("-" * 60)

        except KeyboardInterrupt:
            print("\n")
            break

        except EOFError:
            print("\n")
            break

    print("\nGoodbye!")


if __name__ == "__main__":
    main()
