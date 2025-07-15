# templates/adept-base/e2b.Dockerfile

# Pull the E2B base image from the regional registry your CLI is using
FROM docker.e2b.app/e2b/base:latest

# Install the tools we need for file processing
RUN apt-get update && \
    apt-get install -y \
        ffmpeg \
        poppler-utils \
        gnumeric && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
