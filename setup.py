import os
import sys
import platform
import subprocess


def get_os():
    """Detect the current operating system."""
    system = platform.system().lower()
    if system == "windows":
        return "windows"
    elif system == "darwin":
        return "macos"
    elif system == "linux":
        return "linux"
    else:
        return "unknown"


def is_ffmpeg_installed():
    """Check if ffmpeg is already installed."""
    try:
        subprocess.run(
            ["ffmpeg", "-version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def install_ffmpeg():
    """Install ffmpeg based on the detected OS."""
    os_type = get_os()

    if is_ffmpeg_installed():
        print("✅ ffmpeg is already installed.")
        return True

    print(f"📦 Installing ffmpeg on {os_type}...")

    try:
        if os_type == "windows":
            # Requires winget (Windows Package Manager, available on Win 10+)
            result = subprocess.run(
                ["winget", "install", "Gyan.FFmpeg", "--silent", "--accept-package-agreements", "--accept-source-agreements"],
                check=True,
            )

        elif os_type == "macos":
            # Requires Homebrew
            result = subprocess.run(
                ["brew", "install", "ffmpeg"],
                check=True,
            )

        elif os_type == "linux":
            # Detect Linux distro
            distro_info = platform.freedesktop_os_release() if hasattr(platform, "freedesktop_os_release") else {}
            distro_id = distro_info.get("ID", "").lower()
            distro_like = distro_info.get("ID_LIKE", "").lower()

            if distro_id in ("ubuntu", "debian", "linuxmint", "pop") or "debian" in distro_like:
                subprocess.run(["sudo", "apt-get", "update", "-y"], check=True)
                subprocess.run(["sudo", "apt-get", "install", "-y", "ffmpeg"], check=True)

            elif distro_id in ("fedora", "rhel", "centos", "rocky", "alma") or "fedora" in distro_like or "rhel" in distro_like:
                subprocess.run(["sudo", "dnf", "install", "-y", "ffmpeg"], check=True)

            elif distro_id == "arch" or "arch" in distro_like:
                subprocess.run(["sudo", "pacman", "-Sy", "--noconfirm", "ffmpeg"], check=True)

            elif distro_id == "opensuse" or "suse" in distro_like:
                subprocess.run(["sudo", "zypper", "install", "-y", "ffmpeg"], check=True)

            else:
                print("⚠️  Unsupported Linux distro. Please install ffmpeg manually:")
                print("   https://ffmpeg.org/download.html")
                return False
        else:
            print("❌ Unsupported OS. Please install ffmpeg manually:")
            print("   https://ffmpeg.org/download.html")
            return False

        if is_ffmpeg_installed():
            print("✅ ffmpeg installed successfully!")
            return True
        else:
            print("❌ ffmpeg installation failed. Please install it manually.")
            return False

    except subprocess.CalledProcessError as e:
        print(f"❌ Installation error: {e}")
        print("   Please install ffmpeg manually: https://ffmpeg.org/download.html")
        return False
    except FileNotFoundError as e:
        print(f"❌ Package manager not found: {e}")
        print("   Please install ffmpeg manually: https://ffmpeg.org/download.html")
        return False


def create_env():
    """Create a .env file in the same directory as config.py if it doesn't exist."""
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")

    if os.path.exists(env_path):
        print("⚠️  .env file already exists, skipping creation.")
        return

    env_content = """\
# Discord Bot Configuration
DISCORD_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
# Filebin settings
FILEBIN_KEY="smalltext"
# Channel / IDs
CHANNEL_ID=1234567890
# Font path (optional, for add_text.py)
FONT_PATH = "fonts/OpenSansExtraBold.ttf"
# NVIDIA GPU usage (use if you have nvidia gpu, for combine.py)
NVIDIA_GPU = False
IG_USERNAME = "NULL"

IG_PASSWORD = "NULL"
"""

    with open(env_path, "w") as f:
        f.write(env_content)

    print(f"✅ .env file created at: {env_path}")
    print("   ✏️  Remember to fill in your actual values!")


# ── Runtime info ─────────────────────────────────────────────────────────────

OS_TYPE     = get_os()
PYTHON_VER  = sys.version
ARCH        = platform.machine()

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"🖥️  OS      : {OS_TYPE}")
    print(f"🐍 Python  : {PYTHON_VER}")
    print(f"💻 Arch    : {ARCH}")
    print()
    install_ffmpeg()
    print()
    create_env()