FROM strapi/base

WORKDIR /srv/app

COPY ./package.json ./

RUN yarn install

COPY . .

ARG DATABASE_URL=${DATABASE_URL}
ENV NODE_ENV production

RUN yarn build

EXPOSE 1337

CMD ["yarn", "start"]
