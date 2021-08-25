FROM node:14

WORKDIR /code

COPY package*.json ./

RUN npm install pm2 -g

RUN npm install --production

COPY index.js ./
