FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

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
ARG WORDPRESS_GRAPHQL_API_URL
ENV WORDPRESS_GRAPHQL_API_URL $WORDPRESS_GRAPHQL_API_URL
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

USER nextjs

# i dont understand why, but setting the .env variables
# before building does not preserve them at runtime
# for that reason we have to set them again here after the build
ARG WORDPRESS_GRAPHQL_API_URL
ENV WORDPRESS_GRAPHQL_API_URL $WORDPRESS_GRAPHQL_API_URL
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

ARG PORT
ENV PORT $PORT
EXPOSE $PORT

CMD ["node", "server.js"]