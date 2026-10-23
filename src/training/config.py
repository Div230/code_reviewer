from dataclasses import dataclass, field
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]

DATASETS_DIR = ROOT_DIR / "datasets"
MODELS_DIR = ROOT_DIR / "models"
CHECKPOINTS_DIR = ROOT_DIR / "checkpoints"
OUTPUTS_DIR = ROOT_DIR / "outputs"


@dataclass(frozen=True)
class DataConfig:
    dataset_path: Path = DATASETS_DIR
    conversation_column: str = "messages"


@dataclass(frozen=True)
class ModelConfig:
    backend: str = "peft"

    # Base model
    model_name: str = "Qwen/Qwen2-1.5B-Instruct"

    # Context
    max_seq_length: int = 1024

    # Quantization
    load_in_4bit: bool = True

    # LoRA
    lora_rank: int = 16
    lora_alpha: int = 16
    lora_dropout: float = 0.0
    bias: str = "none"

    # Gradient checkpointing
    use_gradient_checkpointing: str = "standard"

    # Randomness
    seed: int = 42

    # LoRA target modules
    target_modules: list[str] = field(
        default_factory=lambda: [
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ]
    )


@dataclass(frozen=True)
class TrainingConfig:
    output_dir: Path = OUTPUTS_DIR / "qwen2-1.5B-codereviewer"

    num_train_epochs: int = 3

    per_device_train_batch_size: int = 1
    gradient_accumulation_steps: int = 16

    learning_rate: float = 2e-4
    weight_decay: float = 0.01
    warmup_ratio: float = 0.03

    lr_scheduler_type: str = "cosine"

    logging_steps: int = 10
    eval_steps: int = 500
    save_steps: int = 500

    save_total_limit: int = 3

    bf16: bool = True
    fp16: bool = False

    seed: int = 42

    run_name: str = "qwen2-1.5B-codereviewer"

    report_to: str = "none"


data = DataConfig()
model = ModelConfig()
training = TrainingConfig()


def load_config(path=None):
    """Strict JSON configuration; relative paths resolve from the config file."""
    import json
    from dataclasses import fields

    configs = {"data": DataConfig, "model": ModelConfig, "training": TrainingConfig}
    raw = json.loads(Path(path).read_text()) if path else {}
    if not isinstance(raw, dict) or set(raw) - set(configs):
        raise ValueError("Expected data, model and training configuration sections")
    result = []
    for section, cls in configs.items():
        values = raw.get(section, {})
        if not isinstance(values, dict) or set(values) - {f.name for f in fields(cls)}:
            raise ValueError(f"Unknown keys in {section}")
        values = dict(values)
        for name, value in values.items():
            expected = cls.__annotations__[name]
            if expected is Path:
                valid = isinstance(value, str) and bool(value)
            elif expected is bool:
                valid = type(value) is bool
            elif expected is int:
                valid = type(value) is int
            elif expected is float:
                valid = type(value) in (int, float)
            elif expected is str:
                valid = isinstance(value, str)
            else:
                valid = isinstance(value, list) and all(isinstance(item, str) for item in value)
            if not valid:
                raise ValueError(f"Invalid type for {section}.{name}")
        for name in ("dataset_path", "output_dir"):
            if name in values:
                value = Path(values[name]).expanduser()
                values[name] = (
                    (Path(path).resolve().parent / value).resolve()
                    if not value.is_absolute()
                    else value
                )
        result.append(cls(**values))
    data_cfg, model_cfg, train_cfg = result
    if model_cfg.backend not in {"peft", "unsloth"}:
        raise ValueError("model.backend must be peft or unsloth")
    if model_cfg.use_gradient_checkpointing not in {"standard", "unsloth", "none"}:
        raise ValueError("Invalid gradient checkpointing mode")
    if model_cfg.backend == "peft" and model_cfg.use_gradient_checkpointing == "unsloth":
        raise ValueError("Unsloth checkpointing requires the unsloth backend")
    if model_cfg.max_seq_length < 16 or model_cfg.lora_rank < 1 or model_cfg.lora_alpha < 1:
        raise ValueError("Invalid context length or LoRA configuration")
    if train_cfg.learning_rate <= 0 or train_cfg.num_train_epochs <= 0:
        raise ValueError("Learning rate and epochs must be positive")
    if train_cfg.per_device_train_batch_size < 1 or train_cfg.gradient_accumulation_steps < 1:
        raise ValueError("Batch sizes must be positive")
    if train_cfg.bf16 and train_cfg.fp16:
        raise ValueError("Choose one mixed precision format")
    if train_cfg.report_to not in {"none", "wandb"}:
        raise ValueError("report_to must be none or wandb")
    return data_cfg, model_cfg, train_cfg
