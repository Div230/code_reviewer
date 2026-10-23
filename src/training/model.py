from unsloth import FastLanguageModel
from pathlib import Path
from .config import model


def load_model(config=model):
    llm, tokenizer = FastLanguageModel.from_pretrained(
        model_name=config.model_name,
        max_seq_length=config.max_seq_length,
        load_in_4bit=config.load_in_4bit,
        trust_remote_code=False,
    )

    template_path = Path(__file__).parent / "chat_template.jinja"
    tokenizer.chat_template = template_path.read_text(encoding="utf-8")

    llm = FastLanguageModel.get_peft_model(
        llm,
        r=config.lora_rank,
        target_modules=config.target_modules,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        bias=config.bias,
        use_gradient_checkpointing=config.use_gradient_checkpointing,
        random_state=config.seed,
    )

    return tokenizer, llm
