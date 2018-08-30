FROM node:10.8

# Create app directory
WORKDIR /usr/src/app

#RUN npm config set proxy http://proxy.kmm.com.br:3128
#RUN npm config set https-proxy http://proxy.kmm.com.br:3128

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

#RUN npm install
# If you are building your code for production
RUN npm install --only=production

# Bundle app source
COPY . .

EXPOSE 4327
CMD [ "npm", "start" ]

