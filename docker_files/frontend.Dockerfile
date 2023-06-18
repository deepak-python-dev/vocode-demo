# Base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to the container
COPY ./vocode_react_demo/. .

# Install dependencies
RUN npm install
