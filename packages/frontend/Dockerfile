FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/frontend/package.json ./packages/frontend/

RUN bun install

COPY packages/frontend/ ./packages/frontend/

ARG VITE_API_URL=http://localhost:8000
ARG VITE_APP_URL=http://localhost:3000
ARG SENTRY_DSN=""
ARG VITE_PLAUSIBLE_DOMAIN=""

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_URL=$VITE_APP_URL
ENV SENTRY_DSN=$SENTRY_DSN
ENV VITE_PLAUSIBLE_DOMAIN=$VITE_PLAUSIBLE_DOMAIN
ENV NODE_ENV=production

WORKDIR /app/packages/frontend
RUN sed -i "s/preset: 'vercel'/preset: 'bun'/" nitro.config.ts

RUN bun run build

FROM oven/bun:1-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/packages/frontend/.output ./.output

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", ".output/server/index.mjs"]
