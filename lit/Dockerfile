FROM caddy:2.7-alpine

# Copy webapp build output
COPY ./dist /usr/share/caddy/html

# Copy Caddy configuration file
COPY ./Caddyfile /etc/caddy/Caddyfile

# Expose port 4201
EXPOSE 4201
