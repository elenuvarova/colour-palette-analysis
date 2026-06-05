FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
# Empty string → fetch("/api/…") relative to current origin, proxied by nginx
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx gosu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app/ ./app/
COPY --from=frontend-builder /frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Non-root account for the uvicorn worker. nginx's master still starts as root
# (to bind :80); start.sh drops uvicorn to this user via gosu. App code is
# world-readable and the app writes nothing to disk, so no chown is needed.
RUN useradd --system --uid 10001 --no-create-home appuser

EXPOSE 80

# Probe through nginx on :80 (not uvicorn:8000 directly) so a dead public
# ingress is detected too. curl isn't in this image; python3 always is.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:80/health', timeout=4)" || exit 1

CMD ["/start.sh"]
