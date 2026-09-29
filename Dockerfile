FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV API_PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
