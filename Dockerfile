FROM node:20-alpine3.18
RUN apk add yarn
WORKDIR /var/app
COPY ./app/dns-server/nodejs .
RUN yarn install
CMD ["yarn", "start"]
