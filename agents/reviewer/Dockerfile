# Project base image — shared by all agents in this project.
# This extends the Action Llama base image.
#
# SAFE TO CUSTOMIZE:
#   - Add system packages (RUN apk add ...)
#   - Install language runtimes or CLI tools
#
# DO NOT MODIFY:
#   - The FROM line — Action Llama rewrites it at build time to the correct base image
#
# Examples:
#   RUN apk add --no-cache python3 py3-pip
#   RUN apk add --no-cache github-cli

FROM al-agent:latest

USER root
RUN apk add --no-cache github-cli
USER node
