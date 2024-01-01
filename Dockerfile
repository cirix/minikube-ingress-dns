FROM node:21-alpine3.18
RUN apk add yarn
WORKDIR /var/app
COPY ./app/nodejs .
RUN yarn install
CMD ["yarn", "start"]
