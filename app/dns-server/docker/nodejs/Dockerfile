FROM node:12-alpine

RUN apk add yarn

COPY nodejs /var/app

WORKDIR /var/app

RUN yarn install

EXPOSE 5353

CMD ["yarn", "start"]