# syntax=docker/dockerfile:1
FROM node:22-slim AS builder
WORKDIR /app

# Vite values are build-time inputs for the single-server deployment.
ARG VITE_API_BASE_URL=
ARG VITE_APP_TITLE=OkulBlog
ARG VITE_APP_LOGO=
ARG VITE_APP_ID=
ARG VITE_OAUTH_PORTAL_URL=
ARG VITE_ANALYTICS_ENDPOINT=
ARG VITE_ANALYTICS_WEBSITE_ID=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_APP_TITLE=$VITE_APP_TITLE \
    VITE_APP_LOGO=$VITE_APP_LOGO \
    VITE_APP_ID=$VITE_APP_ID \
    VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL \
    VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT \
    VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY patches ./patches
RUN npm install -g corepack@latest && corepack pnpm install --frozen-lockfile
COPY . .
RUN corepack pnpm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 3000
CMD ["node", "dist/index.js"]
