FROM node:12-alpine

RUN apk add yarn

COPY app /var/app

WORKDIR /var/app

RUN yarn install

EXPOSE 53

CMD ["yarn", "start"]