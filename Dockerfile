FROM node:14

WORKDIR /app

COPY ./package.json ./yarn.lock /app/

RUN yarn install

COPY . ./

RUN yarn build

CMD ["yarn", "start"]
