"""Merge a trusted local PEFT adapter; importing this module loads nothing."""

import argparse
from pathlib import Path


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-model", default="Qwen/Qwen2-1.5B-Instruct")
    parser.add_argument("--adapter", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    if not args.adapter.is_dir() or args.output.exists():
        parser.error("Adapter must exist and output must be a new directory")
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel

    base = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=torch.bfloat16,
        device_map="auto",
        trust_remote_code=False,
        use_safetensors=True,
    )
    # Keep the exact tokenizer and chat template saved alongside the adapter.
    tokenizer = AutoTokenizer.from_pretrained(str(args.adapter), trust_remote_code=False)
    model = PeftModel.from_pretrained(base, str(args.adapter), use_safetensors=True)
    model = model.merge_and_unload()
    model.save_pretrained(str(args.output), safe_serialization=True, max_shard_size="2GB")
    tokenizer.save_pretrained(str(args.output))


if __name__ == "__main__":
    main()
