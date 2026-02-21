FROM node:20-alpine AS builder

WORKDIR /opt/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /opt/app

COPY --from=builder /opt/app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /opt/app/dist ./dist
COPY --from=builder /opt/app/config ./config
COPY --from=builder /opt/app/public ./public

RUN mkdir -p public/uploads

ENV NODE_ENV=production

EXPOSE 1337

CMD ["npm", "run", "start"]
