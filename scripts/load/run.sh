#!/bin/bash
# Load-test runner (task 8.6, spec/16): autocannon across the seeded
# hosts at the spec's site-surface target (500 req/min sustained across
# 200 hosts, p95 TTFB < 500ms, error rate < 0.1%).
#
#   LOAD_HOSTS="load-0000.sites.localhost:3000 load-0001.sites.localhost:3000" \
#     scripts/load/run.sh
#
# Or against staging:  HOST=https://staging.example.sh scripts/load/run.sh
set -e
RATE=${RATE:-8}              # req/s ≈ 500 req/min
DURATION=${DURATION:-30}
HOST=${HOST:-http://localhost:3000}
HOSTNAME_PREFIX=${HOSTNAME_PREFIX:-load-}
COUNT=${COUNT:-50}

echo "=== load fixture: ${COUNT} hosts × ${RATE} req/s × ${DURATION}s"
SITES_DOMAIN=${SITES_DOMAIN:-$(grep NEXT_PUBLIC_SITES_DOMAIN .env | cut -d'"' -f2)}
SITES_DOMAIN=${SITES_DOMAIN:-sites.localhost}
for i in $(seq 0 $((COUNT - 1))); do
  slug="load-$(printf '%04d' $i)"
  host_header="${slug}.${SITES_DOMAIN}"
  echo "--- ${host_header}"
  npx autocannon -R "$RATE" -d "$DURATION" -H "Host: ${host_header}" "$HOST/" 2>&1 | grep -E "Latency|Requests|errors|Req/Sec" | tail -4
done
