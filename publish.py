#!/usr/bin/env python3
"""Build and publish the blog to the GitHub Pages repository.

Works on Windows and Linux.

Linux / macOS:
    make publish

Windows (Python 3 + Git required):
    python publish.py publish
    python publish.py build
"""

import argparse
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "_site"
TARGET = ROOT.parent / "yangyushi.github.io"

KEEP = {".git", ".gitignore", ".nojekyll", "CNAME"}


def run_shell(cmd, cwd=None):
    print(f"+ {cmd}")
    subprocess.run(cmd, cwd=cwd, shell=True, check=True)


def run(cmd, cwd=None):
    print("+ " + " ".join(cmd))
    subprocess.run(cmd, cwd=cwd, check=True)


def build():
    if (ROOT / "Gemfile").exists():
        run_shell("bundle exec jekyll build")
    else:
        run_shell("jekyll build")


def sync():
    if not SITE.is_dir():
        sys.exit("error: _site not found, run `build` first")
    if not TARGET.is_dir():
        sys.exit(f"error: target repo not found at {TARGET}")

    for entry in TARGET.iterdir():
        if entry.name in KEEP:
            continue
        if entry.is_dir() and not entry.is_symlink():
            shutil.rmtree(entry)
        else:
            entry.unlink()

    for entry in SITE.iterdir():
        dst = TARGET / entry.name
        if entry.is_dir():
            shutil.copytree(entry, dst, dirs_exist_ok=True)
        else:
            shutil.copy2(entry, dst)


def publish():
    build()
    sync()

    run(["git", "add", "-A"], cwd=TARGET)

    diff = subprocess.run(
        ["git", "diff", "--cached", "--quiet"], cwd=TARGET
    ).returncode
    if diff == 0:
        print("nothing to commit")
    else:
        today = date.today().strftime("%m-%d-%y")
        run(["git", "commit", "-m", f"post update {today}"], cwd=TARGET)

    run(["git", "push"], cwd=TARGET)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        nargs="?",
        default="publish",
        choices=["build", "publish"],
        help="action to run (default: publish)",
    )
    args = parser.parse_args()

    if args.action == "build":
        build()
    else:
        publish()


if __name__ == "__main__":
    main()
