FROM node:alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install -g ts-node
RUN npm install
COPY /. .

EXPOSE 3001
CMD [ "ts-node", "server.ts" ]
