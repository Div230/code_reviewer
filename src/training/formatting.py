def create_formatting_func(tokenizer):
    def formatting_func(examples):
        conversations = examples["messages"]

        # Single example
        if conversations and isinstance(conversations[0], dict):
            return [
                tokenizer.apply_chat_template(
                    conversations,
                    tokenize=False,
                    add_generation_prompt=False,
                )
            ]

        # Batched examples
        return [
            tokenizer.apply_chat_template(
                conversation,
                tokenize=False,
                add_generation_prompt=False,
            )
            for conversation in conversations
        ]

    return formatting_func
