#!/usr/bin/env python3
"""Install collectors, preserving the previous files in a dated backup."""
from datetime import datetime
import os
from pathlib import Path
import shutil

repo = Path(__file__).resolve().parents[1]
data = Path(os.environ.get("XDG_DATA_HOME", str(Path.home() / ".local/share")))
state = Path(os.environ.get("XDG_STATE_HOME", str(Path.home() / ".local/state")))
backup = state / "rime-input-logger/backups" / ("capture-" + datetime.now().strftime("%Y%m%d-%H%M%S"))
files = {
    "rime/lua/commit_logger.lua": "fcitx5/rime/lua/commit_logger.lua",
    "rime/lua/journal_events.lua": "fcitx5/rime/lua/journal_events.lua",
    "fcitx5/addon/journal-focus.conf": "fcitx5/addon/journal-focus.conf",
    "fcitx5/lua/journal-focus/main.lua": "fcitx5/lua/journal-focus/main.lua",
}
for source, destination in files.items():
    target = data / destination
    if target.exists():
        saved = backup / destination
        saved.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, saved)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(repo / source, target)
print(f"Collectors installed. Previous files, if present: {backup}")
print("Apply the schema patch in docs/rime-journal.md, then restart Fcitx5 to load the collectors.")
