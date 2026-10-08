"""Run with python3 tests/native/focus.py."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import sys
import dbus

if "--private-bus" not in sys.argv:
    raise SystemExit(subprocess.call(["dbus-run-session", "--", sys.executable, __file__, "--private-bus"]))

repo = Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory(prefix="rime-focus-test-") as directory:
    root = Path(directory)
    data = root / "data" / "fcitx5"
    shutil.copytree(repo / "fcitx5", data)
    env = dict(os.environ, XDG_DATA_HOME=str(root / "data"), XDG_CONFIG_HOME=str(root / "config"), RIME_COMMIT_LOG_ROOT=str(root / "journal"))
    env.pop("DISPLAY", None)
    env.pop("WAYLAND_DISPLAY", None)
    with (root / "fcitx.log").open("w+") as log:
        process = subprocess.Popen(["fcitx5", "-k", "--disable=all", "--enable=dbus,dbusfrontend,keyboard,luaaddonloader,journal-focus"], env=env, stdout=log, stderr=log)
        try:
            bus = dbus.SessionBus()
            for _ in range(50):
                if bus.name_has_owner("org.fcitx.Fcitx5"):
                    break
                time.sleep(0.1)
            assert bus.name_has_owner("org.fcitx.Fcitx5"), "isolated Fcitx5 did not start"
            interface = dbus.Interface(bus.get_object("org.fcitx.Fcitx5", "/org/freedesktop/portal/inputmethod"), "org.fcitx.Fcitx.InputMethod1")
            path, _ = interface.CreateInputContext(dbus.Array([dbus.Struct(("program", "journal-fixture"))], signature="(ss)"))
            context = dbus.Interface(bus.get_object("org.fcitx.Fcitx5", path), "org.fcitx.Fcitx.InputContext1")
            context.FocusIn()
            context.FocusOut()
            context.DestroyIC()
            records = [json.loads(line) for file in (root / "journal/activity").glob("*.jsonl") for line in file.read_text().splitlines()]
            kinds = [record["kind"] for record in records]
            assert "focus_in" in kinds and "focus_out" in kinds, kinds
            assert len({record["focusId"] for record in records}) == len(records)
            print("Native Fcitx5 focus-in/out and unique boundary IDs passed")
        except Exception:
            log.seek(0)
            print(log.read())
            raise
        finally:
            process.terminate()
            process.wait(timeout=5)
