FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY patch-security.mjs ./
RUN node patch-security.mjs
COPY server.mjs .
EXPOSE 8004
CMD ["node", "server.mjs"]
