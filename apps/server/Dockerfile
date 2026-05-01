FROM node:22-alpine AS base
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/game-engine/package.json packages/game-engine/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm install

COPY . .
RUN npm run build --workspace @monoverse/game-engine && npm run build --workspace @monoverse/server

EXPOSE 4001
CMD ["npm", "run", "start", "--workspace", "@monoverse/server"]

