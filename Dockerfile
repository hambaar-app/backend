##############
# Base Stage #
##############
FROM node:22-alpine AS base

LABEL Maintainer="Mohammad Hosseini <mimhe1381@gmail.com>"

WORKDIR /usr/app
COPY package*.json ./

#####################
# Development Stage #
#####################
FROM base AS dev

COPY package*.json ./

RUN npm ci && \
    npm install -g npm@11 && \
    npm install -g @nestjs/cli && \
    npm cache clean --force

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

###############
# Build Stage #
###############
FROM base AS build

RUN npm ci

COPY ./ ./

RUN npm run prisma:generate && \
    npm run build && \
    npm prune --production && \
    npm cache clean --force

#################################
# Production Dependencies Stage #
#################################
FROM node:22-alpine AS prod-deps
WORKDIR /usr/app

COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && \
    npm cache clean --force && \
    rm -rf ~/.npm

############## Test Stage ##############
# Soon

############## Runtime Stage ##############
FROM node:22-alpine AS runtime

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /usr/app

COPY --from=build --chown=nestjs:nodejs /usr/app/dist ./dist
COPY --from=prod-deps --chown=nestjs:nodejs /usr/app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /usr/app/package.json ./
COPY --from=build --chown=nestjs:nodejs /usr/app/generated ./generated

USER nestjs

EXPOSE 3000

CMD ["npm", "run", "start:prod"]