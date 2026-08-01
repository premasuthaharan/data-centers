"""
Helpers for writing and retaining dated snapshots of the data centers dataset
under data/snapshots/. Retention is isolated in prune_snapshots() so a future
policy change (e.g. "keep monthly for a year, then quarterly") is a small,
localized edit instead of a rewrite of fetch_data.py.
"""

import os


def write_snapshot(output: dict, date_str: str, snapshots_dir: str = "data/snapshots") -> str:
    """Write `output` to <snapshots_dir>/<date_str>.json, overwriting any
    existing snapshot for that date. Returns the path written."""
    import json

    os.makedirs(snapshots_dir, exist_ok=True)
    path = os.path.join(snapshots_dir, f"{date_str}.json")
    with open(path, "w") as f:
        json.dump(output, f, indent=2)
    return path


def prune_snapshots(snapshots_dir: str = "data/snapshots", policy: str = "keep-all") -> list[str]:
    """Apply a retention policy to the snapshots directory, returning the
    list of filenames removed. The only supported policy today is
    "keep-all" (a no-op) since snapshot volume is low (monthly runs); this
    function exists as the single point to edit when a real policy
    (age-based thinning, etc.) is needed later."""
    if policy != "keep-all":
        raise ValueError(f"Unknown retention policy: {policy!r}")
    return []
