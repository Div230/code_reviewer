"""Validate the exact public file manifest and scan for common leakage patterns.

Default mode permits ignored local development outputs. --strict permits only
manifest files (and Git's own metadata), suitable for a clean export or checkout.
This deliberately does not claim exhaustive secret detection.
"""

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL_DIRS = {
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    "dist",
    "build",
    ".ruff_cache",
    ".pytest_cache",
    "coverage",
}
FORBIDDEN_SUFFIXES = {
    ".bin",
    ".safetensors",
    ".pt",
    ".pth",
    ".pkl",
    ".pickle",
    ".gguf",
    ".arrow",
    ".parquet",
    ".zip",
    ".tar",
    ".gz",
    ".log",
    ".csv",
    ".sqlite",
    ".db",
    ".dump",
    ".ipynb",
}
PATTERNS = {
    "private-key": re.compile(r"-----BEGIN " + r"(?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "github-token": re.compile(r"\bgh[pousr]_" + r"[A-Za-z0-9]{30,}\b"),
    "github-pat": re.compile(r"github_pat_" + r"[A-Za-z0-9_]{40,}"),
    "aws-key": re.compile(r"\b(?:AKIA|ASIA)" + r"[A-Z0-9]{16}\b"),
    "hf-token": re.compile(r"\bhf_" + r"[A-Za-z0-9]{25,}\b"),
    "private-home-path": re.compile(r"/(?:home|Users)/" + r"[A-Za-z0-9_.-]+/"),
    "lfs-pointer": re.compile(r"version https://git-lfs.github.com/spec/" + r"v1"),
}


def scan(root=ROOT, strict=False):
    allowed = json.loads((root / "public-files.json").read_text())
    if not isinstance(allowed, list) or len(set(allowed)) != len(allowed):
        raise ValueError("Manifest must contain unique relative file paths")
    failures = []
    for rel in allowed:
        p = Path(rel)
        if p.is_absolute() or ".." in p.parts:
            failures.append(f"Unsafe manifest path: {rel}")
        elif not (root / rel).is_file():
            failures.append(f"Missing public file: {rel}")
    stack = [root]
    discovered = set()
    while stack:
        directory = stack.pop()
        for path in directory.iterdir():
            rel = path.relative_to(root).as_posix()
            if path.is_symlink():
                failures.append(f"Symlink prohibited: {rel}")
                continue
            if path.name == ".git":
                continue
            if not strict and (
                path.name in LOCAL_DIRS or path.name == ".env" or path.name.endswith(".tsbuildinfo")
            ):
                continue
            if path.is_dir():
                stack.append(path)
                continue
            discovered.add(rel)
            if rel not in allowed:
                failures.append(f"Unlisted public file: {rel}")
                continue
            if path.suffix in FORBIDDEN_SUFFIXES or path.name == ".gitmodules":
                failures.append(f"Prohibited artifact: {rel}")
            if path.stat().st_size > 2_000_000:
                failures.append(f"Oversized public file: {rel}")
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeError, OSError):
                failures.append(f"Non-text public file: {rel}")
                continue
            for name, pattern in PATTERNS.items():
                if pattern.search(text):
                    failures.append(f"{name}: {rel}")
    return failures, len(discovered)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    failures, count = scan(strict=args.strict)
    if failures:
        raise SystemExit("\n".join(failures))
    print(f"Public manifest and pattern scan passed: {count} files")


if __name__ == "__main__":
    main()
