import requests
import os
import secrets
import string


def upload_to_filebin(file_path):
    """Upload a video file to filebin.net and return the browser-playable URL."""
    random_text = ''.join(
        secrets.choice(string.ascii_letters + string.digits) for _ in range(10)
    )
    file_name = os.path.basename(file_path)
    bin_name = f"{os.getenv('FILEBIN_KEY', 'smalltext')}{random_text}"
    url = f"https://filebin.net/{bin_name}/{file_name}"

    try:
        with open(file_path, "rb") as f:
            response = requests.post(
                url,
                data=f,
                headers={"Content-Type": "application/octet-stream"},
            )

        if response.status_code in (200, 201):
            print(f"✅ Uploaded successfully: {url}")
            os.remove(file_path)
            print(f"🗑️ Local file removed: {file_path}")
        else:
            print(f"⚠️ Upload failed (status {response.status_code}): {response.text}")
            print(f"🟡 File not deleted: {file_path}")

    except Exception as e:
        print(f"❌ Error uploading file: {e}")
        print(f"🟡 File not deleted: {file_path}")

    return url