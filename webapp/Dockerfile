FROM caddy:2.7-alpine

# Copy webapp build output
COPY ./dist/browser /usr/share/caddy/html

# Copy Caddy configuration file
COPY ./Caddyfile /etc/caddy/Caddyfile

# Expose port 4200 (default Angular port)
EXPOSE 4200
