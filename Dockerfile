FROM node:20-slim
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
RUN npm install --include=dev
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "run", "server:start"]
