FROM alpine
COPY dist /dist
COPY package.json /dist
COPY package-lock.json /dist
WORKDIR /dist
RUN apk add --no-cache nodejs npm
RUN npm install
ENTRYPOINT [ "node", "app.js" ]