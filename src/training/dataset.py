"""Load preprocessed local splits, validating structure without printing records."""

import json
from pathlib import Path
from .config import data
from .preprocess import validate_messages


def load_datasets(config=data):
    from datasets import Dataset, load_from_disk

    splits = []
    for name in ("train_50k", "val", "test"):
        path = Path(config.dataset_path) / name
        if path.with_suffix(".jsonl").is_file():
            records = [
                json.loads(line)
                for line in path.with_suffix(".jsonl").read_text().splitlines()
                if line.strip()
            ]
            dataset = Dataset.from_list(records)
        else:
            dataset = load_from_disk(str(path))
        if config.conversation_column != "messages":
            dataset = dataset.rename_column(config.conversation_column, "messages")
        if len(dataset) == 0:
            raise ValueError(f"Empty split: {name}")
        # Remove original metadata and personal identifiers before trainer access.
        dataset = dataset.map(validate_messages, remove_columns=dataset.column_names)
        splits.append(dataset)
    # Check duplicate user inputs across all splits, including legacy disk datasets.
    seen = set()
    for dataset in splits:
        current = set()
        for record in dataset:
            user = tuple(m["content"] for m in record["messages"] if m["role"] == "user")
            if user in seen:
                raise ValueError("Duplicate user input across dataset splits")
            current.add(user)
        seen.update(current)
    return tuple(splits)
