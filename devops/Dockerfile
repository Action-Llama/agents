FROM al-agent:latest
USER root
RUN apt-get update && apt-get install -y --no-install-recommends gh curl jq && rm -rf /var/lib/apt/lists/*
USER node