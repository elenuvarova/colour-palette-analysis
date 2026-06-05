#!/bin/sh
set -eu

# Track child PIDs so a SIGTERM/SIGINT (e.g. `docker stop`) tears the whole
# container down cleanly instead of leaving orphaned processes behind.
supervisor_pid=""
nginx_pid=""

shutdown() {
    [ -n "$supervisor_pid" ] && kill "$supervisor_pid" 2>/dev/null || true
    [ -n "$nginx_pid" ] && kill "$nginx_pid" 2>/dev/null || true
    exit 0
}
trap shutdown TERM INT

# Supervise uvicorn: if it ever exits, restart it. nginx will serve 502s in the
# gap, but the :80 /health probe will flip the container unhealthy if uvicorn
# can't stay up, so Docker/Coolify can restart the whole container.
(
    while true; do
        gosu appuser uvicorn app.main:app --host 127.0.0.1 --port 8000 \
            --proxy-headers --forwarded-allow-ips 127.0.0.1 || true
        echo "uvicorn exited (code $?), restarting in 1s..." >&2
        sleep 1
    done
) &
supervisor_pid=$!

# nginx is the public ingress and stays in the foreground. Run it backgrounded
# but `wait` on it so the trap above can still fire on signals.
nginx -g "daemon off;" &
nginx_pid=$!

wait "$nginx_pid"
