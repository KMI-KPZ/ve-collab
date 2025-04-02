FROM node:18-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apt-get update && \
    apt-get install -y libc6 && \
    apt-get install -y git
WORKDIR /app

# prevent puppeteer from downloading chromium, we will install it manually
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# disable telemetry
ENV NEXT_TELEMETRY_DISABLED 1

# pass .env variables to build from docker_compose
ARG NEXTAUTH_URL
ENV NEXTAUTH_URL $NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ENV NEXTAUTH_SECRET $NEXTAUTH_SECRET
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID $NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ARG KEYCLOAK_CLIENT_SECRET
ENV KEYCLOAK_CLIENT_SECRET $KEYCLOAK_CLIENT_SECRET
ARG NEXT_PUBLIC_KEYCLOAK_BASE_URL
ENV NEXT_PUBLIC_KEYCLOAK_BASE_URL $NEXT_PUBLIC_KEYCLOAK_BASE_URL
ARG NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_REALM $NEXT_PUBLIC_KEYCLOAK_REALM
ARG NEXT_PUBLIC_BACKEND_BASE_URL
ENV NEXT_PUBLIC_BACKEND_BASE_URL $NEXT_PUBLIC_BACKEND_BASE_URL
ARG NEXT_PUBLIC_ETHERPAD_BASE_URL
ENV NEXT_PUBLIC_ETHERPAD_BASE_URL $NEXT_PUBLIC_ETHERPAD_BASE_URL
ARG NEXT_PUBLIC_SOCKETIO_BASE_URL
ENV NEXT_PUBLIC_SOCKETIO_BASE_URL $NEXT_PUBLIC_SOCKETIO_BASE_URL
ARG NEXT_PUBLIC_FEEDBACK_FORM_URL
ENV NEXT_PUBLIC_FEEDBACK_FORM_URL $NEXT_PUBLIC_FEEDBACK_FORM_URL
ARG MATERIAL_BASE_URL
ENV MATERIAL_BASE_URL $MATERIAL_BASE_URL

# run build
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# install google chrome manually on the runner
# because copying it from puppeteer cache crashes for some reason
ENV XDG_CONFIG_HOME=/tmp/.chromium
ENV XDG_CACHE_HOME=/tmp/.chromium
ENV CHROME_BIN /usr/bin/google-chrome
RUN apt-get update && apt-get install -y gnupg wget && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
  apt-get update && \
  apt-get install -y google-chrome-stable --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

USER nextjs

# i dont understand why, but setting the .env variables
# before building does not preserve them at runtime
# for that reason we have to set them again here after the build
ARG NEXTAUTH_URL
ENV NEXTAUTH_URL $NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ENV NEXTAUTH_SECRET $NEXTAUTH_SECRET
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID $NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ARG KEYCLOAK_CLIENT_SECRET
ENV KEYCLOAK_CLIENT_SECRET $KEYCLOAK_CLIENT_SECRET
ARG NEXT_PUBLIC_KEYCLOAK_BASE_URL
ENV NEXT_PUBLIC_KEYCLOAK_BASE_URL $NEXT_PUBLIC_KEYCLOAK_BASE_URL
ARG NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_REALM $NEXT_PUBLIC_KEYCLOAK_REALM
ARG NEXT_PUBLIC_BACKEND_BASE_URL
ENV NEXT_PUBLIC_BACKEND_BASE_URL $NEXT_PUBLIC_BACKEND_BASE_URL
ARG NEXT_PUBLIC_SOCKETIO_BASE_URL
ENV NEXT_PUBLIC_SOCKETIO_BASE_URL $NEXT_PUBLIC_SOCKETIO_BASE_URL
ARG NEXT_PUBLIC_ETHERPAD_BASE_URL
ENV NEXT_PUBLIC_ETHERPAD_BASE_URL $NEXT_PUBLIC_ETHERPAD_BASE_URL
ARG MATERIAL_BASE_URL
ENV MATERIAL_BASE_URL $MATERIAL_BASE_URL

ARG PORT
ENV PORT $PORT
EXPOSE $PORT

ENV HOSTNAME 0.0.0.0

CMD ["node", "server.js"]
