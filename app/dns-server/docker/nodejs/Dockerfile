FROM node:12.16.1-alpine3.11
RUN apk add yarn
COPY nodejs /var/app
WORKDIR /var/app
RUN yarn install
CMD ["yarn", "start"]
