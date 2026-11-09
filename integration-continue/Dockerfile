FROM node:22-alpine@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202 AS base
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit
COPY prisma/schema.prisma prisma/schema.prisma
RUN npm run prisma:generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev --no-audit

FROM base
ENV NODE_ENV=production PORT=4000
RUN --mount=type=cache,target=/root/.npm npm install --global --ignore-scripts --no-audit --no-fund npm@11.21.2
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json prisma.config.ts ./
COPY prisma/schema.prisma prisma/schema.prisma
COPY prisma/migrations prisma/migrations
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
