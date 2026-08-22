# To use this Dockerfile, you have to set `output: 'standalone'` in your next.config.ts file.
# From https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

FROM node:22.17.0-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile --config.strict-dep-builds=false; \
  else echo "Lockfile not found." && exit 1; \
  fi


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Runs `payload migrate` against DATABASE_URL. Built from `builder`, not
# `runner`: the runner is Next's trace-pruned standalone output, which
# doesn't include the payload CLI at all -- migrations need the full
# toolchain. Not part of the default `up`; invoke explicitly, e.g.:
#   docker compose --env-file .env.prod -f docker-compose.yml \
#     -f docker-compose.prod.yml run --rm migrator
FROM builder AS migrator
CMD corepack enable pnpm && pnpm exec payload migrate

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# The PDF export route (src/app/(frontend)/planning/export/route.ts) drives
# this system Chromium via `puppeteer-core`, not puppeteer's own bundled
# download -- that download is a glibc binary and this image is musl-based
# Alpine, so it simply won't run here. ttf-freefont avoids missing-glyph
# boxes in the rendered PDF for any non-Latin characters.
RUN apk add --no-cache chromium ttf-freefont
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Media.ts's `staticDir: 'media'` writes uploads to a plain relative path
# (Payload's own uploadFiles.js calls fs.writeFile with no mkdir first),
# resolved against the container's cwd (/app). Without this directory
# existing and being writable by the non-root `nextjs` user the process
# runs as, every upload fails with ENOENT, masked by Payload's production
# error handling as a generic "Something went wrong." Mount a volume here
# in docker-compose (see media_uploads) so uploads also survive a rebuild
# -- this mkdir only guarantees the directory exists and is writable on a
# fresh container/volume, not that uploads persist across one.
RUN mkdir media
RUN chown nextjs:nodejs media

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD HOSTNAME="0.0.0.0" node server.js
