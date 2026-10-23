"""Explicit model backends; imports never download models or initialize CUDA."""

from pathlib import Path
from .config import model


def _chat_template(tokenizer):
    tokenizer.chat_template = (Path(__file__).parent / "chat_template.jinja").read_text(
        encoding="utf-8"
    )


def load_model(config=model):
    if config.backend == "unsloth":
        return _load_unsloth(config)
    if config.backend != "peft":
        raise ValueError("Unknown training backend")
    return _load_peft(config)


def _load_unsloth(config):
    try:
        from unsloth import FastLanguageModel
    except ImportError as error:
        raise RuntimeError(
            "Unsloth is an optional backend and is not installed by the audited training lock. "
            "Use backend=peft, or supply an independently reviewed Unsloth environment."
        ) from error
    llm, tokenizer = FastLanguageModel.from_pretrained(
        model_name=config.model_name,
        max_seq_length=config.max_seq_length,
        load_in_4bit=config.load_in_4bit,
        trust_remote_code=False,
    )
    _chat_template(tokenizer)
    checkpointing = {"unsloth": "unsloth", "standard": True, "none": False}[
        config.use_gradient_checkpointing
    ]
    llm = FastLanguageModel.get_peft_model(
        llm,
        r=config.lora_rank,
        target_modules=config.target_modules,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        bias=config.bias,
        use_gradient_checkpointing=checkpointing,
        random_state=config.seed,
    )
    return tokenizer, llm


def _load_peft(config):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, set_seed
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

    set_seed(config.seed)
    kwargs = {"trust_remote_code": False, "use_safetensors": True}
    checkpointing = config.use_gradient_checkpointing != "none"
    if config.load_in_4bit:
        if not torch.cuda.is_available():
            raise RuntimeError(
                "4-bit training requires a compatible CUDA GPU; no model has been loaded"
            )
        # Select an appropriate 4-bit compute dtype for this GPU.
        dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        kwargs["quantization_config"] = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=dtype,
        )
    tokenizer = AutoTokenizer.from_pretrained(config.model_name, trust_remote_code=False)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    _chat_template(tokenizer)
    llm = AutoModelForCausalLM.from_pretrained(config.model_name, **kwargs)
    if config.load_in_4bit:
        llm = prepare_model_for_kbit_training(llm, use_gradient_checkpointing=checkpointing)
    elif checkpointing:
        llm.gradient_checkpointing_enable()
        llm.enable_input_require_grads()
    llm.config.use_cache = False
    adapter = LoraConfig(
        r=config.lora_rank,
        target_modules=config.target_modules,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        bias=config.bias,
        task_type="CAUSAL_LM",
    )
    return tokenizer, get_peft_model(llm, adapter)
