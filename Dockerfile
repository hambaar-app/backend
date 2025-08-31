##############
# Base Stage #
##############
FROM node:22-bookworm-slim AS base

LABEL Maintainer="Mohammad Hosseini <mimhe1381@gmail.com>"

RUN apt-get update -y && \
    apt-get upgrade -y && \
    apt-get install -y openssl && \
    apt-get install -y bash && \
    npm install -g ts-node && \
    npm install -g @nestjs/cli && \
    npm install -g prisma && \
    npm install -g concurrently

WORKDIR /usr/app
COPY package*.json ./

#############################
#     Development Stage     #
#############################
FROM base AS dev

RUN npm ci && \
    npm cache clean --force

COPY ./ ./

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

#######################
#     Build Stage     #
#######################
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
FROM base AS prod-deps

RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && \
    npm cache clean --force && \
    rm -rf ~/.npm

##############
# Test Stage #
##############

# Soon

#########################
#     Runtime Stage     #
#########################
FROM base AS runtime

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nestjs

COPY --from=build --chown=nestjs:nodejs /usr/app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /usr/app/generated ./generated
COPY --from=prod-deps --chown=nestjs:nodejs /usr/app/node_modules ./node_modules
COPY /prisma ./prisma
COPY entrypoint.sh ./

EXPOSE 3000

# ENTRYPOINT ["./entrypoint.sh"]
RUN chmod 755 ./entrypoint.sh

CMD ["npm", "run", "start:prod"]
