# Stage 0, "build-stage", based on Node.js, to build and compile the frontend
FROM node:alpine as build-stage
WORKDIR /app
COPY package*.json /app/
RUN npm install -g @angular/cli
RUN npm install
COPY ./ /app/
ARG configuration=production
RUN npm run build -- --output-path=./dist/out --configuration $configuration --base-href /palabrate/

# Stage 1, based on Nginx, to have only the compiled app, ready for production with Nginx
FROM nginx:1.15
#Copy ci-dashboard-dist
COPY --from=build-stage /app/dist/out/ /usr/share/nginx/html
#Copy default nginx configuration
COPY ./nginx-custom.conf /etc/nginx/conf.d/default.conf




#This below works on PC36 but not on Kubernetes Modemos
# FROM node:alpine

# WORKDIR /usr/src/app

# COPY . /usr/src/app

# RUN npm install -g @angular/cli

# RUN npm install

# CMD ["ng", "serve", "--host", "0.0.0.0", "--disable-host-check"]