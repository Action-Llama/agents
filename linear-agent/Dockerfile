FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY linear-integration/ ./linear-integration/

# Install dependencies  
RUN npm install

# Copy agent configuration
COPY linear-agent/ ./

# Set up Action-Llama
ENV NODE_PATH=/app/node_modules

ENTRYPOINT ["npx", "al", "start"]