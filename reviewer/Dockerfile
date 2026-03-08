FROM al-agent:latest
USER root
RUN apt-get update && apt-get install -y --no-install-recommends gh jq && rm -rf /var/lib/apt/lists/*
USER node