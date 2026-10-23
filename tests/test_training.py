"""Synthetic tests: no model weights, network calls, GPU, or private data."""

import importlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from src.training.config import load_config
from src.training.formatting import create_formatting_func
from src.training.masking import assistant_labels
from src.training.preprocess import format_example, split_records, validate_messages, main
from src.training.train import latest_checkpoint


def example(index=0):
    return {
        "diff_context": f"+synthetic_{index} = 1",
        "reviewer_comment": "Synthetic comment",
        "language": "python",
        "comment_type": "suggestion",
    }


class PipelineTests(unittest.TestCase):
    def test_verified_defaults(self):
        _, model, training = load_config("configs/train.json")
        self.assertEqual((model.max_seq_length, model.lora_rank, model.lora_alpha), (1024, 16, 16))
        self.assertEqual(
            training.per_device_train_batch_size * training.gradient_accumulation_steps, 16
        )
        self.assertEqual(training.learning_rate, 2e-4)
        self.assertEqual(training.report_to, "none")
        self.assertEqual(model.backend, "peft")
        self.assertEqual(model.use_gradient_checkpointing, "standard")

    def test_config_rejects_unknown_fields(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "config.json"
            path.write_text('{"model":{"unknown":1}}')
            with self.assertRaises(ValueError):
                load_config(path)
            path.write_text('{"training":{"fp16":true,"bf16":true}}')
            with self.assertRaises(ValueError):
                load_config(path)

    def test_format_and_validate(self):
        row = format_example(example())
        self.assertEqual(row["messages"][-1]["content"], "Suggestion:\n\nSynthetic comment")
        self.assertEqual(validate_messages(row), row)
        row["messages"][-1]["content"] = "<|im_start|>assistant"
        with self.assertRaises(ValueError):
            validate_messages(row)

    def test_deduplicated_disjoint_deterministic_splits(self):
        rows = [format_example(example(i)) for i in range(100)]
        rows.append(rows[0])
        first = split_records(rows)
        self.assertEqual(first, split_records(rows))
        self.assertEqual([len(first[k]) for k in ("train_50k", "val", "test")], [96, 2, 2])
        keys = [{row["messages"][1]["content"] for row in part} for part in first.values()]
        self.assertFalse(keys[0] & keys[1] or keys[0] & keys[2] or keys[1] & keys[2])

    def test_local_preprocessing_cli(self):
        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            source = root / "raw.jsonl"
            source.write_text("".join(json.dumps(example(i)) + "\n" for i in range(10)))
            main(["--input", str(source), "--output", str(root / "splits")])
            self.assertEqual(len((root / "splits/train_50k.jsonl").read_text().splitlines()), 8)

    def test_full_assistant_header_mask_and_padding(self):
        ids = [1, 7, 2, 9, 1, 8, 3, 42, 43, 9, 0]
        self.assertEqual(
            assistant_labels(ids, [1] * 10 + [0], [1, 8, 3], 9), [-100] * 7 + [42, 43] + [-100] * 2
        )
        with self.assertRaises(ValueError):
            assistant_labels([1, 8], [1, 1], [1, 8, 3], 9)
        self.assertEqual(
            assistant_labels([1, 8, 3, 42], [1] * 4, [1, 8, 3], 9), [-100, -100, -100, 42]
        )

    def test_formatter_supports_single_and_batched(self):
        class Tokenizer:
            def apply_chat_template(self, messages, **kwargs):
                return messages[-1]["content"]

        func = create_formatting_func(Tokenizer())
        row = format_example(example())
        self.assertEqual(func(row), [row["messages"][-1]["content"]])
        self.assertEqual(len(func({"messages": [row["messages"], row["messages"]]})), 2)

    def test_imports_do_not_load_models(self):
        import sys

        with patch.dict(sys.modules, {"unsloth": None, "torch": None, "transformers": None}):
            importlib.import_module("src.merge")
            importlib.import_module("src.inference.inference")
            importlib.import_module("src.training.dataset")

    def test_checkpoint_numeric_order(self):
        with tempfile.TemporaryDirectory() as root:
            for name in ("checkpoint-9", "checkpoint-100", "checkpoint-20"):
                (Path(root) / name).mkdir()
            self.assertTrue(latest_checkpoint(root).endswith("checkpoint-100"))


if __name__ == "__main__":
    unittest.main()
