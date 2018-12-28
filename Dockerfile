FROM node:10.8

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY NodeJS/KMMWebSocket/package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY NodeJS/KMMWebSocket/ /usr/src/app/

EXPOSE 4327

CMD [ "npm", "start" ]

