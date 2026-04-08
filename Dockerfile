FROM al-agent:latest

USER root
RUN apk add --no-cache ripgrep
USER node
