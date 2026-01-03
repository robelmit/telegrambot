FROM node:20-alpine

# Install dependencies for canvas and sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/
COPY src/locales/ ./src/locales/
COPY src/assets/ ./src/assets/ 2>/dev/null || true

# Create temp directory
RUN mkdir -p /app/temp

# Set environment
ENV NODE_ENV=production

# Run the bot
CMD ["node", "dist/index.js"]
