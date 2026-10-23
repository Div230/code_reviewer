"""Token-level assistant label masking, independent of torch for CPU tests."""


def assistant_labels(ids, attention, header, end_token):
    labels = [-100] * len(ids)
    cursor = 0
    while cursor <= len(ids) - len(header):
        if ids[cursor : cursor + len(header)] != header:
            cursor += 1
            continue
        start = cursor + len(header)
        try:
            end = ids.index(end_token, start)
        except ValueError:
            # A truncated assistant answer is still a valid supervised prefix.
            end = len(ids)
        for index in range(start, end):
            if attention[index]:
                labels[index] = ids[index]
        cursor = end + 1
    if not any(value != -100 for value in labels):
        raise ValueError("No assistant tokens survive truncation; inspect data/context length")
    return labels
