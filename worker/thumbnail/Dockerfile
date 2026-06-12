FROM node:20-slim

RUN apt-get update && apt-get install -y \
    libreoffice-nogui \
    poppler-utils \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
