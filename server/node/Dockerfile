# Standalone Node 22 API; https://docs.nestjs.com/deployment
ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
COPY test ./test
RUN npm run build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production SAVORA_ENVIRONMENT=Production SAVORA_BIND_HOST=0.0.0.0 PORT=5094
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist/src ./dist/src
COPY openapi ./openapi
COPY migrations ./migrations
COPY database ./database
USER node
EXPOSE 5094
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://localhost:5094/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/src/main.js"]
