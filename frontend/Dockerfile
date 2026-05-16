# Build stage
FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Preview stage
FROM node:22

WORKDIR /app

COPY --from=0 /app ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]