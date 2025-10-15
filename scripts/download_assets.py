import os
import io
import zipfile
import urllib.request
import dnfile
import re
import xml.etree.ElementTree as ET
import json
import shutil
import html
from PIL import Image

# --- Base directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP_DIR = os.path.join(BASE_DIR, ".tmp", "paintdotnet")
OUT_DIR = os.path.join(BASE_DIR, "assets")
LANG_DIR = os.path.join(OUT_DIR, "lang")

# --- Configuration ---
PDN_VERSION = "5.1.9"
PDN_URL = f"https://github.com/paintdotnet/release/releases/download/v{PDN_VERSION}/paint.net.{PDN_VERSION}.portable.x64.zip"

# Resource filenames inside the ZIP
RESOURCES_DLL_NAME = "PaintDotNet.Resources.dll"
RESX_FILE_NAME = "resx\PaintDotNet.Strings.3.resx"
ICO_FILE_NAME = "paintdotnet.ico"

# Output filenames
OUTPUT_ICO_NAME = "icon.ico"
OUTPUT_PNG_NAME = "icon.png"
OUTPUT_LANG_FILE = "en.json"

# --- Utilities ---
def is_png(data):
    return data.startswith(b"\x89PNG\r\n\x1a\n")

def download_and_extract_zip(url, extract_to):
    os.makedirs(extract_to, exist_ok=True)
    zip_path = os.path.join(extract_to, "paintdotnet.zip")
    if not os.path.exists(zip_path):
        print(f"Downloading Paint.NET from {url} ...")
        urllib.request.urlretrieve(url, zip_path)
        print("Download complete.")
    else:
        print("Using existing downloaded zip.")

    print("Extracting ZIP...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_to)
    print("ZIP extracted.\n")

def sanitize_name(name):
    parts = name.split(".")
    name = "_".join(parts[2:-2])
    name = re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()
    name = re.sub(r"__+", "_", name)
    return name

# --- Extract PNG assets ---
def extract_highest_resolution_assets(dll_path):
    try:
        with dnfile.dnPE(dll_path) as pe:
            if not pe.net or not pe.net.resources:
                print(f"No managed resources in {dll_path}")
                return

            print(f"Processing {dll_path}...")

            assets = {}

            for r in pe.net.resources:
                try:
                    name = str(r.name)
                    data = r.data
                    if not data or not is_png(data):
                        continue

                    # Extract resolution
                    match = re.search(r'(\d+)\.png$', name)
                    res_number = int(match.group(1)) if match else 0
                    type_dir = name.split(".")[1].lower()

                    sanitized = sanitize_name(name)
                    directory = os.path.join(OUT_DIR, type_dir)
                    os.makedirs(directory, exist_ok=True)

                    if sanitized not in assets or res_number > assets[sanitized][0]:
                        assets[sanitized] = (res_number, data, directory)

                except Exception as e:
                    print(f"Error parsing resource {r.name}: {e}")

            # Save PNG assets
            for sanitized, (_, data, folder) in assets.items():
                out_file = os.path.join(folder, sanitized + ".png")
                if os.path.exists(out_file):
                    print(f" -> Skipping existing {out_file}")
                    continue
                with open(out_file, "wb") as f:
                    f.write(data)
                print(f" -> Saved {out_file}")

            print(f"\nAssets saved to {OUT_DIR}.\n")

    except Exception as e:
        print(f"Failed to open {dll_path}: {e}")

# --- Extract strings from .resx ---
def extract_strings(resx_file):
    if not os.path.exists(resx_file):
        print(f"{resx_file} not found!")
        return

    os.makedirs(LANG_DIR, exist_ok=True)
    json_path = os.path.join(LANG_DIR, OUTPUT_LANG_FILE)

    print(f"Processing {resx_file}...")

    flat_dict = {}

    try:
        tree = ET.parse(resx_file)
        root = tree.getroot()
        for data_node in root.findall("data"):
            key = data_node.attrib.get("name")
            value_node = data_node.find("value")
            value = value_node.text if value_node is not None and value_node.text is not None else ""

            value = html.unescape(value)
            value = value.replace("&", "")

            parts = key.split(".")
            parts = [p[0].lower() + p[1:] if p else p for p in parts]
            flat_key = "_".join(parts)
            flat_dict[flat_key] = value

    except Exception as e:
        print(f"Error parsing {resx_file}: {e}")
        return

    # Sort keys
    flat_dict = dict(sorted(flat_dict.items()))

    # Convert to nested structure
    def set_nested(current, path, value):
        id = path[0]
        if len(path) == 1:
            current[id] = value
        else:
            if id not in current:
                current[id] = {}
            elif isinstance(current[id], str):
                current[id] = {"text": current[id]}
            set_nested(current[id], path[1:], value)

    nested_dict = {}
    for key, val in flat_dict.items():
        set_nested(nested_dict, key.split("_"), val)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(nested_dict, f, indent=4, ensure_ascii=False)

    print(f" -> Strings saved to {json_path}\n")

# --- Extract icon ---
def extract_icon(ico_file):
    if not os.path.exists(ico_file):
        print(f"{ico_file} not found!")
        return

    os.makedirs(OUT_DIR, exist_ok=True)
    out_ico = os.path.join(OUT_DIR, OUTPUT_ICO_NAME)
    out_png = os.path.join(OUT_DIR, OUTPUT_PNG_NAME)

    # Save as .ico
    with open(ico_file, "rb") as src, open(out_ico, "wb") as dst:
        dst.write(src.read())
    print(f" -> Icon saved to {out_ico}")

    # Save as .png
    with Image.open(ico_file) as img:
        img.save(out_png)
    print(f" -> Icon saved to {out_png}")

# --- Main ---
if __name__ == "__main__":
    download_and_extract_zip(PDN_URL, TMP_DIR)

    # Extract PNG assets
    resources_dll = os.path.join(TMP_DIR, RESOURCES_DLL_NAME)
    extract_highest_resolution_assets(resources_dll)

    # Extract strings
    strings_file = os.path.join(TMP_DIR, RESX_FILE_NAME)
    extract_strings(strings_file)

    # Extract icon
    ico_file = os.path.join(TMP_DIR, ICO_FILE_NAME)
    extract_icon(ico_file)

    # Delete temporary directory
    shutil.rmtree(TMP_DIR)

    print("Extracted all assets successfully.")