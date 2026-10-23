from trl import SFTTrainer, SFTConfig
from .config import training, model as model_config
from .formatting import create_formatting_func
from .collator import AssistantOnlyDataCollator


def create_trainer(
    model, tokenizer, train_dataset, val_dataset, config=training, model_cfg=model_config
):
    args = SFTConfig(
        output_dir=str(config.output_dir),
        num_train_epochs=config.num_train_epochs,
        per_device_train_batch_size=config.per_device_train_batch_size,
        gradient_accumulation_steps=config.gradient_accumulation_steps,
        learning_rate=config.learning_rate,
        weight_decay=config.weight_decay,
        warmup_ratio=config.warmup_ratio,
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
        seed=config.seed,
        report_to=config.report_to,
        run_name=config.run_name,
    )
    return SFTTrainer(
        model=model,
        processing_class=tokenizer,
        formatting_func=create_formatting_func(tokenizer),
        data_collator=AssistantOnlyDataCollator(tokenizer),
        args=args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
    )
