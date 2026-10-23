"""Prevent the CPU profile from losing the package index required by its wheel."""

from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DependencyLockTests(unittest.TestCase):
    def test_cpu_input_and_lock_declare_the_wheel_index(self):
        for name in ("requirements-cpu.in", "requirements-cpu.txt"):
            with self.subTest(file=name):
                lines = (ROOT / name).read_text().splitlines()
                indexes = [line.strip() for line in lines if line.startswith("--extra-index-url ")]
                self.assertIn("--extra-index-url https://download.pytorch.org/whl/cpu", indexes)
                self.assertTrue(
                    any(line.startswith("torch==") and "+cpu" in line for line in lines)
                )


if __name__ == "__main__":
    unittest.main()
