# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY ./package*.json /app/
RUN npm ci
RUN npm install -g @angular/cli

COPY ./ /app/
RUN ng build --configuration production

# Runner stage (serves the webapp)
FROM caddy:2.7-alpine AS runner

# Copy webapp output build
COPY --from=builder /app/dist/browser /usr/share/caddy/html

# Copy Caddy configuration file
COPY ./Caddyfile /etc/caddy/Caddyfile

# Expose port 4200 (default Angular port)
EXPOSE 4200
