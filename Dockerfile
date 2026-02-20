FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY public ./public
COPY .env.example ./.env.example

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
