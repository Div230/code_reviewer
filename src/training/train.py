"""Fine-tune locally; --validate-only never loads a model or contacts a service."""

import argparse
import json
from dataclasses import asdict
from pathlib import Path
from .config import load_config


def latest_checkpoint(output_dir):
    candidates = [
        p
        for p in Path(output_dir).glob("checkpoint-*")
        if p.is_dir() and p.name.split("-")[-1].isdigit()
    ]
    return str(max(candidates, key=lambda p: int(p.name.split("-")[-1]))) if candidates else None


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path)
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--resume", help="Explicit checkpoint; default starts a new run")
    args = parser.parse_args(argv)
    data_cfg, model_cfg, config = load_config(args.config)
    if args.validate_only:
        print(
            json.dumps(
                {"data": asdict(data_cfg), "model": asdict(model_cfg), "training": asdict(config)},
                default=str,
                indent=2,
            )
        )
        return
    # Optional Unsloth patches must initialize before transformers/TRL.
    from .model import load_model

    if model_cfg.backend == "unsloth":
        tokenizer, model = load_model(model_cfg)
    from .dataset import load_datasets
    from .trainer import create_trainer

    if config.output_dir.exists() and any(config.output_dir.iterdir()) and not args.resume:
        parser.error("Output directory is nonempty; use --resume or choose another output_dir")
    train_ds, val_ds, test_ds = load_datasets(data_cfg)
    if model_cfg.backend != "unsloth":
        tokenizer, model = load_model(model_cfg)
    trainer = create_trainer(model, tokenizer, train_ds, val_ds, config, model_cfg)
    config.output_dir.mkdir(parents=True, exist_ok=True)
    (config.output_dir / "run-config.json").write_text(
        json.dumps({"model": asdict(model_cfg), "training": asdict(config)}, default=str, indent=2)
    )
    try:
        trainer.train(resume_from_checkpoint=args.resume)
    except KeyboardInterrupt:
        trainer.save_model(str(config.output_dir / "interrupted"))
        tokenizer.save_pretrained(str(config.output_dir / "interrupted"))
        raise
    metrics = {"validation": trainer.evaluate(), "test": trainer.evaluate(test_ds)}
    trainer.save_model(str(config.output_dir))
    tokenizer.save_pretrained(str(config.output_dir))
    (config.output_dir / "evaluation.json").write_text(json.dumps(metrics, indent=2))
    print(metrics)


if __name__ == "__main__":
    main()
