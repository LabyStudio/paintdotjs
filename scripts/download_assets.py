#!/usr/bin/env python3
"""Download and extract Paint.NET artwork and every shipped translation.

Translations are stored in binary .NET ``.resources`` files. This script
reads their string entries directly, without requiring .NET, Mono, or resgen.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import struct
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath


BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_VERSION = "5.1.12"
DEFAULT_URL = (
    "https://github.com/paintdotnet/release/releases/download/"
    "v{version}/paint.net.{version}.portable.x64.zip"
)
RESOURCE_BASENAME = "PaintDotNet.Strings.3"
RESOURCE_FILE_RE = re.compile(
    rf"^{re.escape(RESOURCE_BASENAME)}(?:\.([A-Za-z0-9-]+))?\.resources$",
    re.IGNORECASE,
)
PNG_SIZE_RE = re.compile(r"(\d+)\.png$", re.IGNORECASE)


class ResourceFormatError(ValueError):
    pass


class BinaryReader:
    def __init__(self, path: Path):
        self.path = path
        self.stream = path.open("rb")

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.stream.close()

    def read(self, length: int) -> bytes:
        value = self.stream.read(length)
        if len(value) != length:
            raise ResourceFormatError(f"Unexpected end of file in {self.path}")
        return value

    def int32(self) -> int:
        return struct.unpack("<i", self.read(4))[0]

    def uint32(self) -> int:
        return struct.unpack("<I", self.read(4))[0]

    def seven_bit_int(self) -> int:
        value = 0
        for shift in range(0, 35, 7):
            byte = self.read(1)[0]
            value |= (byte & 0x7F) << shift
            if byte < 0x80:
                return value
        raise ResourceFormatError(f"Invalid 7-bit integer in {self.path}")

    def string(self, encoding: str = "utf-8") -> str:
        return self.read(self.seven_bit_int()).decode(encoding)

    def seek(self, offset: int, whence: int = 0):
        self.stream.seek(offset, whence)

    def tell(self) -> int:
        return self.stream.tell()


def read_dotnet_string_resources(path: Path) -> dict[str, str]:
    """Read string values from a version 2 .NET .resources file."""
    with BinaryReader(path) as reader:
        if reader.uint32() != 0xBEEFCACE:
            raise ResourceFormatError(f"Not a .NET resources file: {path}")
        manager_header_version = reader.int32()
        if manager_header_version < 1:
            raise ResourceFormatError(f"Unsupported resource manager header: {path}")
        reader.seek(reader.int32(), 1)

        resource_version = reader.int32()
        if resource_version != 2:
            raise ResourceFormatError(
                f"Unsupported .resources version {resource_version}: {path}"
            )
        resource_count = reader.int32()
        type_count = reader.int32()
        if resource_count < 0 or type_count < 0:
            raise ResourceFormatError(f"Invalid resource counts in {path}")
        for _ in range(type_count):
            reader.string()
        while reader.tell() % 8:
            reader.read(1)

        # Hashes are only needed for keyed lookup, not sequential extraction.
        reader.seek(resource_count * 4, 1)
        name_positions = [reader.int32() for _ in range(resource_count)]
        data_section_offset = reader.int32()
        name_section_offset = reader.tell()

        entries: dict[str, str] = {}
        for name_position in name_positions:
            reader.seek(name_section_offset + name_position)
            name = reader.string("utf-16-le")
            value_position = data_section_offset + reader.int32()
            reader.seek(value_position)
            type_code = reader.seven_bit_int()
            if type_code == 0:  # ResourceTypeCode.Null
                value = ""
            elif type_code == 1:  # ResourceTypeCode.String
                value = reader.string()
            else:
                continue
            entries[name] = value
        return entries


def canonicalize_locale(locale: str | None) -> str:
    if not locale:
        return "en"
    parts = locale.replace("_", "-").split("-")
    normalized = [parts[0].lower()]
    for part in parts[1:]:
        normalized.append(part.upper() if len(part) in (2, 3) else part.title())
    return "-".join(normalized)


def strip_mnemonic_markers(value: str) -> str:
    # Paint.NET uses '&' for mnemonics and '&&' for a literal ampersand.
    value = html.unescape(value)
    marker = "\0AMPERSAND\0"
    value = value.replace("&&", marker)
    value = re.sub(r"&(?=.)", "", value)
    return value.replace(marker, "&")


def key_path(key: str) -> list[str]:
    return [part[:1].lower() + part[1:] for part in key.split(".") if part]


def set_nested(target: dict, path: list[str], value: str):
    current = target
    for part in path[:-1]:
        existing = current.get(part)
        if isinstance(existing, str):
            existing = {"text": existing}
            current[part] = existing
        elif not isinstance(existing, dict):
            existing = {}
            current[part] = existing
        current = existing

    leaf = path[-1]
    existing = current.get(leaf)
    current[leaf] = {"text": existing, "value": value} if isinstance(existing, str) else value


def nested_strings(entries: dict[str, str]) -> dict:
    result: dict = {}
    for key in sorted(entries, key=str.casefold):
        path = key_path(key)
        if path:
            set_nested(result, path, strip_mnemonic_markers(entries[key]))
    return result


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(value, indent=4, ensure_ascii=False) + "\n"
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, delete=False
    ) as temporary:
        temporary.write(payload)
        temporary_path = Path(temporary.name)
    temporary_path.replace(path)


def extract_languages(source_dir: Path, output_dir: Path) -> list[str]:
    resource_files: list[tuple[str, Path]] = []
    for path in source_dir.rglob("*"):
        if path.is_file() and (match := RESOURCE_FILE_RE.match(path.name)):
            resource_files.append((canonicalize_locale(match.group(1)), path))
    if not resource_files:
        raise FileNotFoundError(
            f"No {RESOURCE_BASENAME}*.resources files found below {source_dir}"
        )

    locales: list[str] = []
    output_dir.mkdir(parents=True, exist_ok=True)
    for locale, path in sorted(resource_files, key=lambda item: item[0].casefold()):
        entries = read_dotnet_string_resources(path)
        write_json(output_dir / f"{locale}.json", nested_strings(entries))
        locales.append(locale)
        print(f" -> {locale}: {len(entries)} strings")

    # Remove stale generated locale files while preserving unrelated JSON.
    locale_names = set(locales)
    locale_name_re = re.compile(r"[A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*")
    for path in output_dir.glob("*.json"):
        if locale_name_re.fullmatch(path.stem) and path.stem not in locale_names:
            path.unlink()
    write_json(output_dir / "languages.json", {"locales": locales})
    print(f"Extracted {len(locales)} languages to {output_dir}\n")
    return locales


def safe_extract_zip(archive: Path, destination: Path) -> None:
    """Normalize Windows paths and reject ZIP path traversal."""
    destination.mkdir(parents=True, exist_ok=True)
    destination_root = destination.resolve()
    with zipfile.ZipFile(archive) as zipped:
        for member in zipped.infolist():
            normalized = member.filename.replace("\\", "/")
            relative = PurePosixPath(normalized)
            if relative.is_absolute() or ".." in relative.parts:
                raise ValueError(f"Unsafe path in archive: {member.filename}")
            target = destination.joinpath(*relative.parts)
            resolved = target.resolve()
            if resolved != destination_root and destination_root not in resolved.parents:
                raise ValueError(f"Unsafe path in archive: {member.filename}")
            if member.is_dir() or normalized.endswith("/"):
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with zipped.open(member) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output)


def download(url: str, destination: Path, force: bool = False) -> None:
    if destination.exists() and not force:
        print(f"Using cached archive {destination}")
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".part")
    print(f"Downloading Paint.NET from {url} ...")
    request = urllib.request.Request(url, headers={"User-Agent": "paint.js asset extractor"})
    try:
        with urllib.request.urlopen(request, timeout=60) as response, temporary.open("wb") as output:
            shutil.copyfileobj(response, output)
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)


def find_file(source_dir: Path, filename: str) -> Path:
    target = filename.casefold()
    for path in source_dir.rglob("*"):
        if path.is_file() and path.name.casefold() == target:
            return path
    raise FileNotFoundError(f"{filename} not found below {source_dir}")


def sanitize_asset_name(name: str) -> str:
    parts = name.split(".")
    useful = parts[2:-2] if len(parts) > 4 else parts[:-1]
    value = "_".join(useful)
    value = re.sub(r"(?<!^)(?=[A-Z])", "_", value).lower()
    return re.sub(r"__+", "_", value).strip("_")


def extract_png_assets(dll_path: Path, output_dir: Path, overwrite: bool = False) -> int:
    try:
        import dnfile
    except ImportError as error:
        raise RuntimeError("Install dependencies with: pip install -r requirements.txt") from error

    assets: dict[tuple[str, str], tuple[int, bytes]] = {}
    with dnfile.dnPE(str(dll_path)) as pe:
        if not pe.net or not pe.net.resources:
            raise ResourceFormatError(f"No managed resources in {dll_path}")
        for resource in pe.net.resources:
            try:
                name = str(resource.name)
                data = bytes(resource.data or b"")
                if not data.startswith(b"\x89PNG\r\n\x1a\n"):
                    continue
                parts = name.split(".")
                category = parts[1].lower() if len(parts) > 1 else "images"
                asset_name = sanitize_asset_name(name)
                size_match = PNG_SIZE_RE.search(name)
                size = int(size_match.group(1)) if size_match else 0
                key = (category, asset_name)
                if key not in assets or size > assets[key][0]:
                    assets[key] = (size, data)
            except Exception as error:
                print(f"Warning: could not parse {resource.name}: {error}", file=sys.stderr)

    saved = 0
    for (category, asset_name), (_, data) in sorted(assets.items()):
        target = output_dir / category / f"{asset_name}.png"
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() and not overwrite:
            continue
        target.write_bytes(data)
        saved += 1
    print(f"Extracted {saved} PNG assets ({len(assets)} discovered)\n")
    return saved


def extract_icon(icon_path: Path, output_dir: Path) -> None:
    try:
        from PIL import Image
    except ImportError as error:
        raise RuntimeError("Install dependencies with: pip install -r requirements.txt") from error

    output_dir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(icon_path, output_dir / "icon.ico")
    with Image.open(icon_path) as image:
        sizes = image.ico.sizes() if hasattr(image, "ico") else set()
        if sizes:
            image.size = max(sizes, key=lambda size: size[0] * size[1])
        image.convert("RGBA").save(output_dir / "icon.png")
    print(f"Extracted application icon to {output_dir}\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", default=DEFAULT_VERSION)
    parser.add_argument("--url", help="Override the portable ZIP URL")
    parser.add_argument("--source", type=Path, help="Use an existing directory or ZIP")
    parser.add_argument("--output-dir", type=Path, default=BASE_DIR / "assets")
    parser.add_argument("--cache-dir", type=Path, default=BASE_DIR / ".tmp" / "paintdotnet")
    parser.add_argument("--force-download", action="store_true")
    parser.add_argument("--overwrite-assets", action="store_true")
    parser.add_argument("--languages-only", action="store_true")
    parser.add_argument("--keep-extracted", action="store_true")
    return parser.parse_args()


def prepare_source(args: argparse.Namespace) -> tuple[Path, bool]:
    if args.source:
        source = args.source.expanduser().resolve()
        if source.is_dir():
            return source, False
        if not source.is_file() or not zipfile.is_zipfile(source):
            raise ValueError(f"--source must be an extracted directory or ZIP: {source}")
        archive = source
    else:
        archive = args.cache_dir / f"paint.net.{args.version}.portable.x64.zip"
        download(args.url or DEFAULT_URL.format(version=args.version), archive, args.force_download)

    extracted = args.cache_dir / f"paint.net.{args.version}.portable.x64"
    if extracted.exists():
        shutil.rmtree(extracted)
    print(f"Extracting {archive} ...")
    safe_extract_zip(archive, extracted)
    return extracted, True


def main() -> int:
    args = parse_args()
    source_dir, temporary_source = prepare_source(args)
    try:
        extract_languages(source_dir, args.output_dir / "lang")
        if not args.languages_only:
            extract_png_assets(
                find_file(source_dir, "PaintDotNet.Resources.dll"),
                args.output_dir,
                args.overwrite_assets,
            )
            extract_icon(find_file(source_dir, "paintdotnet.ico"), args.output_dir)
    finally:
        if temporary_source and not args.keep_extracted:
            shutil.rmtree(source_dir, ignore_errors=True)
    print("Extracted all requested assets successfully.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, ResourceFormatError, RuntimeError, zipfile.BadZipFile) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1)
