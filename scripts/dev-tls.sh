#!/usr/bin/env bash
# Serve the built PWA over local TLS so it can be installed on a device.
# Usage:  bun run dev:tls            (localhost only)
set -euo pipefail

cd "$(dirname "$0")/.."

HOST="localhost"
CA="${HOME}/.local/share/caddy/pki/authorities/local/root.crt"

command -v caddy >/dev/null || {
	echo "caddy is not installed. See README, 'Local TLS dev server'." >&2
	exit 1
}

echo "Building dist/ (the service worker only exists after a build)…"
bun run build

bun run serve:dist &
SERVE_PID=$!
trap 'kill "${SERVE_PID}" 2>/dev/null || true' EXIT

caddy run --config Caddyfile.dev &
CADDY_PID=$!
trap 'kill "${SERVE_PID}" "${CADDY_PID}" 2>/dev/null || true' EXIT

sleep 2
echo
echo "  https://${HOST}:8443"
echo "  root CA for device trust: ${CA}"
echo
wait "${CADDY_PID}"
