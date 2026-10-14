# This Dockerfile is optional: if Railway still caches weird behavior, you can switch the service to deploy from Docker and the build will be fully deterministic.
FROM python:3.10-slim

# Prevent Python from writing .pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps that eventlet might need
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN python -m pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.txt

COPY . /app

EXPOSE 8000

ENV PORT=8000
CMD ["python", "-u", "-m", "shadow-hunters.app"]
