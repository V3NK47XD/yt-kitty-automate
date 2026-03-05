FROM python:3.13-slim

RUN apt-get update && apt-get install -y ffmpeg\
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-chache-dir -r requirements.txt

COPY . .

ENV PORT=8000

CMD ["python","main.py"]
