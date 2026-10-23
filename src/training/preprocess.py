"""Local-only preprocessing derived from the original notebooks; no downloads."""

import argparse
import hashlib
import json
import random
from pathlib import Path

SYSTEM_PROMPT = (
    "You are an experienced software engineer performing GitHub pull request "
    "reviews. Write clear, concise, and actionable review comments for Git diffs."
)
TYPE_MAP = {
    tag: tag.title()
    for tag in (
        "bug",
        "suggestion",
        "question",
        "refactor",
        "performance",
        "security",
        "style",
        "nitpick",
    )
}


def format_example(example):
    tag = example["comment_type"]
    if tag not in {*TYPE_MAP, "none"}:
        raise ValueError("Unknown comment_type")
    for name in ("diff_context", "reviewer_comment", "language"):
        if not isinstance(example.get(name), str):
            raise ValueError(f"Expected string {name}")
    assistant = example["reviewer_comment"]
    if tag != "none":
        assistant = f"{TYPE_MAP[tag]}:\n\n{assistant}"
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Language: {example['language']}\n\n"
                    "Review the following Git diff. Write one GitHub review comment.\n\n"
                    f"{example['diff_context']}"
                ),
            },
            {"role": "assistant", "content": assistant},
        ]
    }


def validate_messages(record):
    messages = record.get("messages")
    if not isinstance(messages, list) or len(messages) < 2:
        raise ValueError("Expected conversation with user and assistant turns")
    for message in messages:
        if not isinstance(message, dict) or message.get("role") not in {
            "system",
            "user",
            "assistant",
        }:
            raise ValueError("Invalid conversation role")
        if not isinstance(message.get("content"), str) or not message["content"].strip():
            raise ValueError("Empty conversation content")
        if "<|im_start|>" in message["content"] or "<|im_end|>" in message["content"]:
            raise ValueError("Reserved chat tokens in conversation")
    if messages[-1]["role"] != "assistant" or not any(m["role"] == "user" for m in messages):
        raise ValueError("Conversation requires user input and a final assistant answer")
    return {"messages": messages}


def split_records(records, seed=42):
    # Deduplicate by user input, so identical inputs cannot cross split boundaries.
    unique = {}
    for record in records:
        record = validate_messages(record)
        user_input = [m["content"] for m in record["messages"] if m["role"] == "user"]
        digest = hashlib.sha256(json.dumps(user_input, ensure_ascii=False).encode()).hexdigest()
        unique.setdefault(digest, record)
    rows = list(unique.values())
    if len(rows) < 3:
        raise ValueError("Need at least three unique inputs for disjoint splits")
    random.Random(seed).shuffle(rows)
    holdout = max(1, round(len(rows) * 0.02))
    return {
        "train_50k": rows[2 * holdout :],
        "val": rows[:holdout],
        "test": rows[holdout : 2 * holdout],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="Licensed local raw JSONL")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--limit", type=int, default=50000)
    parser.add_argument(
        "--none-limit", type=int, default=29051, help="Historical cap; not a guaranteed percentage"
    )
    args = parser.parse_args(argv)
    if args.output.exists():
        parser.error("Output already exists; choose a new directory")
    if args.limit < 3 or args.none_limit < 0:
        parser.error("Invalid limit")
    rows = [json.loads(line) for line in args.input.read_text().splitlines() if line.strip()]
    random.Random(args.seed).shuffle(rows)
    selected, none_count = [], 0
    for row in rows:
        if row.get("comment_type") == "none":
            if none_count >= args.none_limit:
                continue
            none_count += 1
        selected.append(format_example(row))
        if len(selected) >= args.limit:
            break
    splits = split_records(selected, args.seed)
    args.output.mkdir(parents=True)
    for name, records in splits.items():
        (args.output / f"{name}.jsonl").write_text(
            "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in records)
        )
    # No source records or local input paths in metadata.
    (args.output / "preprocessing.json").write_text(
        json.dumps(
            {
                "seed": args.seed,
                "limit": args.limit,
                "none_limit": args.none_limit,
                "counts": {name: len(rows) for name, rows in splits.items()},
                "input_sha256": hashlib.sha256(args.input.read_bytes()).hexdigest(),
            },
            indent=2,
        )
    )
    print({name: len(rows) for name, rows in splits.items()})


if __name__ == "__main__":
    main()
