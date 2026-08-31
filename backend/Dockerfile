FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy application code
COPY server.js .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Environment
ENV NODE_ENV=production
ENV PORT=8099
ENV DB_PATH=/app/data/data.sqlite

EXPOSE 8099

CMD ["node", "server.js"]
