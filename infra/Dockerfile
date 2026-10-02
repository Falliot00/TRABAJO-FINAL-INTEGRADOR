FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.17.0
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./

FROM dependencies AS backend-build
COPY backend backend
COPY packages/contracts packages/contracts
RUN pnpm --filter @cilgas/backend db:generate \
    && pnpm --filter @cilgas/backend build \
    && pnpm --filter @cilgas/backend deploy --legacy --prod /runtime

FROM backend-build AS backend-tools
WORKDIR /app/backend
USER node
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM base AS backend
ENV NODE_ENV=production
COPY --from=backend-build --chown=node:node /runtime/node_modules ./node_modules
COPY --from=backend-build --chown=node:node /app/backend/package.json ./package.json
COPY --from=backend-build --chown=node:node /app/backend/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]

FROM dependencies AS frontend-build
COPY frontend frontend
COPY packages/contracts packages/contracts
RUN pnpm --filter @cilgas/frontend build

FROM nginx:1.30.5-alpine3.24@sha256:0985e772fb9f729e6fa0980da05fca5d9c468e870eed43071545afa9d2e27d94 AS web
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
