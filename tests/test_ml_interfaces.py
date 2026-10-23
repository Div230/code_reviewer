"""Model initialization wiring uses a mock backend; no model is loaded."""

import importlib
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import Mock, patch
from src.training.config import DataConfig, ModelConfig
from src.training.preprocess import format_example


class ModelWiringTests(unittest.TestCase):
    def test_quantization_lora_and_template_wiring(self):
        calls = {}
        tokenizer = types.SimpleNamespace(chat_template=None)

        class FastLanguageModel:
            @staticmethod
            def from_pretrained(**kwargs):
                calls["load"] = kwargs
                return "synthetic-model", tokenizer

            @staticmethod
            def get_peft_model(model, **kwargs):
                calls["peft"] = kwargs
                return model

        fake = types.ModuleType("unsloth")
        fake.FastLanguageModel = FastLanguageModel
        with patch.dict(sys.modules, {"unsloth": fake}):
            module = importlib.import_module("src.training.model")
            config = ModelConfig(backend="unsloth", load_in_4bit=False, lora_rank=8, lora_alpha=32)
            result = module.load_model(config)
            self.assertEqual(result, (tokenizer, "synthetic-model"))
            self.assertFalse(calls["load"]["load_in_4bit"])
            self.assertFalse(calls["load"]["trust_remote_code"])
            self.assertEqual(calls["load"]["max_seq_length"], 1024)
            self.assertEqual(calls["peft"]["r"], 8)
            self.assertEqual(calls["peft"]["lora_alpha"], 32)
            self.assertIn("{% generation %}", tokenizer.chat_template)
        sys.modules.pop("src.training.model", None)

    def test_native_peft_configuration_without_downloads(self):
        tokenizer = types.SimpleNamespace(pad_token_id=1, chat_template=None)
        base = Mock()
        base.config = types.SimpleNamespace(use_cache=True)
        transformers = types.ModuleType("transformers")
        transformers.AutoModelForCausalLM = types.SimpleNamespace(
            from_pretrained=Mock(return_value=base)
        )
        transformers.AutoTokenizer = types.SimpleNamespace(
            from_pretrained=Mock(return_value=tokenizer)
        )
        transformers.BitsAndBytesConfig = Mock()
        transformers.set_seed = Mock()
        peft = types.ModuleType("peft")
        peft.LoraConfig = Mock(return_value="adapter-config")
        peft.get_peft_model = Mock(return_value="adapted-model")
        peft.prepare_model_for_kbit_training = Mock()
        torch = types.ModuleType("torch")
        torch.cuda = types.SimpleNamespace(is_available=lambda: False)
        with patch.dict(sys.modules, {"torch": torch, "transformers": transformers, "peft": peft}):
            module = importlib.import_module("src.training.model")
            result = module.load_model(ModelConfig(load_in_4bit=False))
            self.assertEqual(result, (tokenizer, "adapted-model"))
            transformers.set_seed.assert_called_once_with(42)
            kwargs = transformers.AutoModelForCausalLM.from_pretrained.call_args.kwargs
            self.assertFalse(kwargs["trust_remote_code"])
            self.assertTrue(kwargs["use_safetensors"])
            self.assertFalse(base.config.use_cache)
            peft.prepare_model_for_kbit_training.assert_not_called()
            self.assertEqual(peft.LoraConfig.call_args.kwargs["r"], 16)
            self.assertEqual(peft.LoraConfig.call_args.kwargs["lora_alpha"], 16)
            base.gradient_checkpointing_enable.assert_called_once()
            with self.assertRaisesRegex(RuntimeError, "CUDA GPU"):
                module.load_model(ModelConfig(load_in_4bit=True))
            self.assertEqual(transformers.AutoTokenizer.from_pretrained.call_count, 1)
        sys.modules.pop("src.training.model", None)

    @unittest.skipUnless(
        importlib.util.find_spec("datasets"), "Optional datasets dependency is not installed"
    )
    def test_real_datasets_loader_on_synthetic_jsonl(self):
        from src.training.dataset import load_datasets

        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            for i, name in enumerate(("train_50k", "val", "test")):
                row = format_example(
                    {
                        "diff_context": f"+synthetic_{i} = 1",
                        "reviewer_comment": "Synthetic",
                        "language": "python",
                        "comment_type": "none",
                    }
                )
                (root / f"{name}.jsonl").write_text(json.dumps(row) + "\n")
            splits = load_datasets(DataConfig(dataset_path=root))
            self.assertEqual([len(ds) for ds in splits], [1, 1, 1])
            self.assertEqual(splits[0].column_names, ["messages"])
            (root / "test.jsonl").write_text((root / "val.jsonl").read_text())
            with self.assertRaisesRegex(ValueError, "Duplicate user input"):
                load_datasets(DataConfig(dataset_path=root))


if __name__ == "__main__":
    unittest.main()
