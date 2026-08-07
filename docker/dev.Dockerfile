FROM node:20.19.6-bookworm

WORKDIR /workspace

RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY scripts scripts
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY shared/package.json shared/package.json

RUN npm ci \
	&& cd backend \
	&& npm rebuild sqlite3 --build-from-source

COPY . .
