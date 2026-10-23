"""Optional real torch/TRL smoke test with a tiny random model, never downloaded.

Run as python -m scripts.check_training_cpu from the repository root in the
candidate training environment. No training optimizer step or generation occurs.
"""

from dataclasses import replace
from pathlib import Path
import tempfile


def main():
    import torch
    from datasets import Dataset
    from tokenizers import Tokenizer
    from tokenizers.models import WordLevel
    from tokenizers.pre_tokenizers import WhitespaceSplit
    from transformers import PreTrainedTokenizerFast, Qwen2Config, Qwen2ForCausalLM
    from src.training.config import ModelConfig, TrainingConfig
    from src.training.preprocess import format_example
    from src.training.trainer import create_trainer

    torch.manual_seed(42)
    vocab = {
        token: index
        for index, token in enumerate(
            [
                "<unk>",
                "<pad>",
                "<|im_start|>",
                "<|im_end|>",
                "assistant",
                "user",
                "system",
                "Synthetic",
                "comment",
                "Language:",
                "python",
                "+synthetic",
                "=",
                "1",
            ]
        )
    }
    raw = Tokenizer(WordLevel(vocab, unk_token="<unk>"))
    raw.pre_tokenizer = WhitespaceSplit()
    tokenizer = PreTrainedTokenizerFast(
        tokenizer_object=raw,
        unk_token="<unk>",
        pad_token="<pad>",
        eos_token="<|im_end|>",
        additional_special_tokens=["<|im_start|>", "<|im_end|>"],
    )
    tokenizer.chat_template = (
        Path(__file__).resolve().parents[1] / "src/training/chat_template.jinja"
    ).read_text()
    model = Qwen2ForCausalLM(
        Qwen2Config(
            vocab_size=len(vocab),
            hidden_size=16,
            intermediate_size=32,
            num_hidden_layers=1,
            num_attention_heads=2,
            num_key_value_heads=2,
            max_position_embeddings=128,
            eos_token_id=vocab["<|im_end|>"],
        )
    )
    row = format_example(
        {
            "diff_context": "+synthetic = 1",
            "reviewer_comment": "Synthetic comment",
            "language": "python",
            "comment_type": "none",
        }
    )
    dataset = Dataset.from_list([row, row])
    with tempfile.TemporaryDirectory() as root:
        config = replace(TrainingConfig(), output_dir=Path(root), bf16=False, fp16=False)
        trainer = create_trainer(
            model, tokenizer, dataset, dataset, config, replace(ModelConfig(), max_seq_length=128)
        )
        batch = next(iter(trainer.get_train_dataloader()))
        supervised = batch["labels"] != -100
        if not bool(supervised.any()):
            raise RuntimeError("Assistant-only labels are empty")
        with torch.no_grad():
            output = model(**batch)
        if not bool(torch.isfinite(output.loss)):
            raise RuntimeError("Tiny model produced nonfinite loss")
    print(
        "CPU dataset/tokenizer/collator/TRL/tiny-model forward check passed; no training performed"
    )


if __name__ == "__main__":
    main()
