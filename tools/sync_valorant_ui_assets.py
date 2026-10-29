"""Refresh the small Valorant UI icons served by Esportra.

Run manually with Python and Pillow. Production builds never require a remote
catalog fetch. Content-hashed filenames keep browser/CDN caches safe to reuse.
"""
import hashlib
import io
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "game-assets" / "valorant"
BASE = "https://valorant-api.com/v1"


def fetch(url):
    with urlopen(Request(url, headers={"User-Agent": "Esportra asset sync"}), timeout=30) as response:
        return response.read()


def icon(entry):
    kind, key, url, size = entry
    source = fetch(url)
    with Image.open(io.BytesIO(source)) as image:
        image = image.convert("RGBA")
        image.thumbnail((size, size), Image.Resampling.LANCZOS)
        data = io.BytesIO()
        image.save(data, format="WEBP", quality=84, method=6)
    result = data.getvalue()
    filename = f"{key}.{hashlib.sha256(result).hexdigest()[:10]}.webp"
    directory = OUTPUT / kind
    directory.mkdir(parents=True, exist_ok=True)
    (directory / filename).write_bytes(result)
    return (kind, key), f"/game-assets/valorant/{kind}/{filename}", len(source), len(result)


def main():
    agents = json.loads(fetch(f"{BASE}/agents?isPlayableCharacter=true"))["data"]
    ladders = json.loads(fetch(f"{BASE}/competitivetiers"))["data"]
    ladder = next(row for row in reversed(ladders) if any(t.get("largeIcon") for t in row.get("tiers", [])))
    tiers = [tier for tier in ladder["tiers"] if 3 <= tier["tier"] <= 27 and tier.get("largeIcon")]
    roles = {a["role"]["displayName"].lower(): a["role"] for a in agents if a.get("role")}
    entries = [("agents", a["uuid"].lower(), a["displayIcon"], 96) for a in agents]
    entries += [("roles", re.sub(r"[^a-z]", "", key), role["displayIcon"], 64) for key, role in roles.items()]
    entries += [("ranks", str(t["tier"]), t["largeIcon"], 64) for t in tiers]
    if len(entries) > 100:
        raise ValueError("Review catalog growth before downloading more than 100 icons")
    with ThreadPoolExecutor(max_workers=6) as executor:
        results = list(executor.map(icon, entries))
    urls = {key: url for key, url, _, _ in results}
    manifest = {
        "agents": {a["uuid"].lower(): {
            "uuid": a["uuid"].lower(), "displayName": a["displayName"],
            "displayIcon": urls[("agents", a["uuid"].lower())],
            "role": a.get("role", {}).get("displayName"),
            "roleIcon": urls.get(("roles", a.get("role", {}).get("displayName", "").lower())),
        } for a in agents},
        "roles": {key: urls[("roles", key)] for key in roles},
        "ranks": {str(t["tier"]): urls[("ranks", str(t["tier"]))] for t in tiers},
    }
    write_manifest(manifest)
    print(json.dumps({"icons": len(results), "original_bytes": sum(r[2] for r in results), "optimized_bytes": sum(r[3] for r in results)}))


def write_manifest(manifest):
    manifest.pop("version", None)
    manifest["version"] = hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest()[:10]
    (ROOT / "src" / "lib" / "valorantUiAssets.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
