#!/usr/bin/env python3
"""Install the local dashboard as a systemd user service."""
import os
from pathlib import Path
import shutil
import subprocess

repo = Path(__file__).resolve().parents[1]
node = shutil.which("node")
if not node or not (repo / "node_modules/tsx/dist/cli.mjs").exists():
    raise SystemExit("Install Node.js and run npm ci first")
if not (repo / "apps/web-dashboard/dist/index.html").exists():
    raise SystemExit("Run npm run web:build first")
port = int(os.environ.get("RIME_WEB_PORT", "38761"))
if not 1024 <= port <= 65535:
    raise SystemExit("RIME_WEB_PORT must be between 1024 and 65535")

def quote(value):
    return '"' + str(value).replace('\\', '\\\\').replace('"', '\\"').replace('%', '%%').replace('$', '$$') + '"'

unit = f"""[Unit]
Description=Rime input journal dashboard

[Service]
Type=simple
WorkingDirectory={str(repo).replace("%", "%%")}
ExecStart={quote(node)} {quote(repo / "node_modules/tsx/dist/cli.mjs")} {quote(repo / "apps/web-dashboard/server/serve.ts")}
Environment=RIME_WEB_PORT={port}
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
"""
config = Path(os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config")))
unit_path = config / "systemd/user/rime-input-logger-web.service"
unit_path.parent.mkdir(parents=True, exist_ok=True)
unit_path.write_text(unit)
subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
subprocess.run(["systemctl", "--user", "enable", "rime-input-logger-web.service"], check=True)
subprocess.run(["systemctl", "--user", "restart", "rime-input-logger-web.service"], check=True)
print(f"Installed {unit_path}\nOpen http://127.0.0.1:{port}")
