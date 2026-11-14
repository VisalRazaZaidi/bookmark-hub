#!/usr/bin/env python3
"""Build the Chrome and Firefox packages for Bookmark Hub.

    python build.py              # both browsers
    python build.py --chrome     # Chrome / Edge / Brave only
    python build.py --firefox    # Firefox only

Output:
    dist/chrome/                 unpacked Chrome build
    dist/firefox/                unpacked Firefox build
    dist/bookmark-hub-chrome.zip upload this to the Chrome Web Store
    dist/bookmark-hub-firefox.zip upload this to addons.mozilla.org

The source folder stays the single source of truth: the two manifests are
derived from manifest.json, never edited by hand.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
INCLUDE = ("manifest.json", "manager.html", "css", "js", "fonts", "icons")
CHROME_MIN = "121"  # optional_host_permissions + MV3 service worker
IGNORE = shutil.ignore_patterns(".DS_Store", "Thumbs.db", "*.map")


def read_manifest() -> dict:
    return json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))


def manifest_for(browser: str, version: str) -> dict:
    m = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    m["version"] = version
    if browser == "chrome":
        # Chrome rejects the Firefox-only keys and background.scripts.
        m.pop("browser_specific_settings", None)
        m["background"] = {"service_worker": "js/background.js"}
        m["minimum_chrome_version"] = CHROME_MIN
    elif browser == "firefox":
        # Firefox uses background.scripts for MV3 and needs the gecko id.
        m["background"] = {"scripts": ["js/background.js"]}
        m.pop("minimum_chrome_version", None)
        if "browser_specific_settings" not in m:
            die("manifest.json is missing browser_specific_settings (required by Firefox)")
    else:
        die(f"unknown browser: {browser}")
    return m


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(1)


def copy_source(dest: Path) -> None:
    for name in INCLUDE:
        src = ROOT / name
        if not src.exists():
            die(f"missing required file: {name}")
        target = dest / name
        if src.is_dir():
            shutil.copytree(src, target, ignore=IGNORE)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, target)


def write_zip(src: Path, zip_path: Path) -> None:
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for path in sorted(src.rglob("*")):
            if path.is_file():
                z.write(path, path.relative_to(src).as_posix())


def check_manifest(m: dict, browser: str) -> None:
    desc = m.get("description", "")
    if len(desc) > 132:
        die(f"description is {len(desc)} chars; the store limit is 132")
    if m.get("manifest_version") != 3:
        die("manifest_version must be 3")
    for perm in m.get("permissions", []):
        if perm == "tabs":
            die("the tabs permission is not needed (it adds a scary install warning)")
    if browser == "chrome" and "service_worker" not in m.get("background", {}):
        die("Chrome build lost its service worker")
    if browser == "firefox" and not m.get("background", {}).get("scripts"):
        die("Firefox build lost background.scripts")


def build(browser: str) -> Path:
    version = read_manifest()["version"]
    out = DIST / browser
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    copy_source(out)

    manifest = manifest_for(browser, version)
    check_manifest(manifest, browser)
    (out / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    zip_path = DIST / f"bookmark-hub-{browser}.zip"
    if zip_path.exists():
        zip_path.unlink()
    write_zip(out, zip_path)

    size = zip_path.stat().st_size / 1024
    print(f"{browser:7} v{version}  {zip_path.relative_to(ROOT)}  ({size:.0f} KB)")
    return zip_path


def main() -> None:
    ap = argparse.ArgumentParser(description="Build Bookmark Hub packages")
    ap.add_argument("--chrome", action="store_true", help="build Chrome only")
    ap.add_argument("--firefox", action="store_true", help="build Firefox only")
    args = ap.parse_args()

    targets = [b for b, on in (("chrome", args.chrome), ("firefox", args.firefox)) if on]
    if not targets:
        targets = ["chrome", "firefox"]

    DIST.mkdir(exist_ok=True)
    for browser in targets:
        build(browser)
    print("done - upload the zips from dist/ to each store.")


if __name__ == "__main__":
    main()
