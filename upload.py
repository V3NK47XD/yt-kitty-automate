import requests
import os
import secrets
import string



def upload_to_filebin(file_path):
    random_text = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))

    url = f"https://filebin.net/{os.getenv('filebin')}{random_text}/{os.path.basename(file_path)}"

    with open(file_path, "rb") as f:
        response = requests.post(
            url,
            data=f,   # ← stream file directly (like curl)
        )
    return url