import torch
from transformers import DataCollatorForLanguageModeling
from .masking import assistant_labels


class AssistantOnlyDataCollator(DataCollatorForLanguageModeling):
    def __init__(self, tokenizer):
        super().__init__(tokenizer=tokenizer, mlm=False)
        self.header = tokenizer.encode("<|im_start|>assistant\n", add_special_tokens=False)
        self.im_end = tokenizer.convert_tokens_to_ids("<|im_end|>")
        if not self.header or self.im_end is None:
            raise ValueError("Tokenizer must support Qwen chat tokens")

    def torch_call(self, examples):
        batch = super().torch_call(examples)
        for row in range(batch["input_ids"].shape[0]):
            labels = assistant_labels(
                batch["input_ids"][row].tolist(),
                batch["attention_mask"][row].tolist(),
                self.header,
                self.im_end,
            )
            batch["labels"][row] = torch.tensor(labels, dtype=batch["labels"].dtype)
        return batch
