import inspect
from trl import SFTTrainer, SFTConfig
from .config import training, model as model_config
from .formatting import create_formatting_func
from .collator import AssistantOnlyDataCollator


def create_trainer(
    model, tokenizer, train_dataset, val_dataset, config=training, model_cfg=model_config
):
    # Transformers 5.20 moved fractional warmup into warmup_steps.
    # Keep the configured ratio and support independently managed older stacks.
    warmup_key = (
        "warmup_ratio"
        if "warmup_ratio" in inspect.signature(SFTConfig).parameters
        else "warmup_steps"
    )
    args = SFTConfig(
        **{warmup_key: config.warmup_ratio},
        output_dir=str(config.output_dir),
        num_train_epochs=config.num_train_epochs,
        per_device_train_batch_size=config.per_device_train_batch_size,
        gradient_accumulation_steps=config.gradient_accumulation_steps,
        learning_rate=config.learning_rate,
        weight_decay=config.weight_decay,
        lr_scheduler_type=config.lr_scheduler_type,
        optim="adamw_torch",
        eval_strategy="steps",
        eval_steps=config.eval_steps,
        logging_steps=config.logging_steps,
        save_strategy="steps",
        save_steps=config.save_steps,
        save_total_limit=config.save_total_limit,
        bf16=config.bf16,
        fp16=config.fp16,
        max_length=model_cfg.max_seq_length,
        packing=False,
        gradient_checkpointing=model_cfg.use_gradient_checkpointing != "none",
        seed=config.seed,
        report_to=config.report_to,
        run_name=config.run_name,
    )
    return SFTTrainer(
        model=model,
        processing_class=tokenizer,
        # Current TRL handles conversational datasets and the saved chat template directly.
        # Retain the formatting interface for independently managed legacy Unsloth stacks.
        formatting_func=create_formatting_func(tokenizer)
        if model_cfg.backend == "unsloth"
        else None,
        data_collator=AssistantOnlyDataCollator(tokenizer),
        args=args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
    )
