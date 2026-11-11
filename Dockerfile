FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY lib ./lib
COPY public ./public
COPY assets ./assets
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV PORT=3000 NODE_ENV=production AT_MODE=mock DATA_FILE=/app/data/gidafix.json DEMO_MODE=false
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server.mjs"]
