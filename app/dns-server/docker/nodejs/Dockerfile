FROM node:21-alpine3.18
RUN apk add yarn
COPY nodejs /var/app
WORKDIR /var/app
RUN yarn install
CMD ["yarn", "start"]
