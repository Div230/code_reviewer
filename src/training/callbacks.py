"""Optional progress callback; never records prompts or model completions."""

import time
from transformers import TrainerCallback


class ETAProgressCallback(TrainerCallback):
    def __init__(self):
        self.start = None

    def on_train_begin(self, args, state, control, **kwargs):
        self.start = time.monotonic()

    def on_log(self, args, state, control, **kwargs):
        if self.start is None:
            return
        steps = max(state.global_step, 1)
        remaining = max(0, state.max_steps - steps)
        eta = remaining * (time.monotonic() - self.start) / steps
        print(f"[Step {steps}/{state.max_steps}] ETA: {int(eta // 3600)}h {int(eta % 3600 // 60)}m")
