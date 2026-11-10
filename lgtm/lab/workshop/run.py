"""Run the workshop service, or one of its solutions, with plain Python.

    python run.py                          the service as the lessons start it
    python run.py solutions/03-propagation  a finished state from solutions/

It creates a virtual environment .venv inside the chosen folder the first
time, installs that folder's requirements.txt into it, then starts the
command named in the folder's workshop.env with these settings, from lowest
to highest priority:

    lab.env                 where the lab is (OTLP address, shop address)
    <folder>/workshop.env   what this variant sends (the OTEL_* switches)
    your environment        anything you set yourself wins

Only the Python standard library is used, so it runs before anything is
installed. The Docker image runs it with --no-venv.
"""

import os
import shlex
import subprocess
import sys
import venv
from pathlib import Path

HERE = Path(__file__).resolve().parent


def read_env(path):
    """KEY=VALUE lines; blank lines and # comments are skipped."""
    values = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip()
    return values


def venv_bin(folder):
    return folder / ".venv" / ("Scripts" if os.name == "nt" else "bin")


def ensure_venv(folder):
    bin_dir = venv_bin(folder)
    python = bin_dir / ("python.exe" if os.name == "nt" else "python")
    stamp = folder / ".venv" / "installed-requirements.txt"
    requirements = (folder / "requirements.txt").read_text(encoding="utf-8")
    if not python.exists():
        print(f"Creating {folder / '.venv'}", flush=True)
        venv.create(folder / ".venv", with_pip=True)
    if not stamp.exists() or stamp.read_text(encoding="utf-8") != requirements:
        print(f"Installing {folder / 'requirements.txt'}", flush=True)
        subprocess.run(
            [str(python), "-m", "pip", "install", "--disable-pip-version-check", "-q", "-r", "requirements.txt"],
            cwd=folder,
            check=True,
        )
        stamp.write_text(requirements, encoding="utf-8")
    return bin_dir


def main(argv):
    use_venv = "--no-venv" not in argv
    args = [a for a in argv if a != "--no-venv"]
    folder = (HERE / (args[0] if args else ".")).resolve()
    if not (folder / "app.py").exists():
        sys.exit(f"{folder} has no app.py; choose . or a folder in solutions/")

    env = {**read_env(HERE / "lab.env"), **read_env(folder / "workshop.env"), **os.environ}
    command = shlex.split(env.pop("WORKSHOP_COMMAND", "python app.py"))
    # The SQLite file stays next to this script, whichever variant runs.
    env.setdefault("WORKSHOP_DB", str(HERE / "workshop.db"))

    if use_venv:
        bin_dir = ensure_venv(folder)
        env["PATH"] = str(bin_dir) + os.pathsep + env.get("PATH", "")
        env["VIRTUAL_ENV"] = str(bin_dir.parent)
        if command[0] == "python":
            command[0] = str(bin_dir / ("python.exe" if os.name == "nt" else "python"))
        elif os.name == "nt":
            command[0] = str(bin_dir / (command[0] + ".exe"))

    shown = {k: v for k, v in env.items() if k.startswith(("OTEL_", "SHOP_", "WORKSHOP_"))}
    print(f"Starting {' '.join(command)} in {folder.relative_to(HERE.parent)}", flush=True)
    for key in sorted(shown):
        print(f"  {key}={shown[key]}", flush=True)
    try:
        sys.exit(subprocess.run(command, cwd=folder, env=env).returncode)
    except KeyboardInterrupt:
        sys.exit(130)


if __name__ == "__main__":
    main(sys.argv[1:])
