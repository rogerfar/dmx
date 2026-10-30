FROM node:24-bookworm AS build

ARG VERSION_NUMBER=development
ARG BUILD_DATE=

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN DATABASE_URL=/tmp/build.db \
    VERSION_NUMBER="$VERSION_NUMBER" \
    BUILD_DATE="$BUILD_DATE" \
    npm run build \
    && npm prune --omit=dev

FROM node:24-bookworm AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL=/data/dmx.db

WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/drizzle ./drizzle

RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 3000
VOLUME ["/data"]

CMD ["node", "build"]