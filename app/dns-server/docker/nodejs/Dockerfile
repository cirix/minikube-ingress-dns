FROM node:alpine3.19
RUN apk add yarn
COPY nodejs /var/app
WORKDIR /var/app
RUN yarn install
CMD ["yarn", "start"]
