#!/usr/bin/env bash
# Project-local PostgreSQL 17 + PostGIS cluster for development and tests (no system service).
# Usage: scripts/dev-db.sh start|stop|reset|status
set -euo pipefail
export LC_ALL="${LC_ALL:-en_US.UTF-8}"  # macOS: Postgres refuses to start with an invalid locale

PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DATA="$ROOT/.pgdata"
PORT="${PGPORT_DEV:-54329}"
SOCKET_DIR="/tmp/moto-trails-pg"
DB_NAME="moto_trails"

start() {
  mkdir -p "$SOCKET_DIR"
  if [ ! -d "$DATA" ]; then
    "$PG_BIN/initdb" -D "$DATA" -U "$(whoami)" --auth=trust -E UTF8 >/dev/null
  fi
  if ! "$PG_BIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then
    "$PG_BIN/pg_ctl" -D "$DATA" -l "$DATA/server.log" -w \
      -o "-p $PORT -c listen_addresses=localhost -c unix_socket_directories=$SOCKET_DIR" start >/dev/null
  fi
  if ! "$PG_BIN/psql" -h localhost -p "$PORT" -d postgres -Atc "select 1 from pg_database where datname='$DB_NAME'" | grep -q 1; then
    "$PG_BIN/createdb" -h localhost -p "$PORT" "$DB_NAME"
  fi
  echo "postgres running on localhost:$PORT (database $DB_NAME)"
}

stop() {
  "$PG_BIN/pg_ctl" -D "$DATA" -m fast stop >/dev/null 2>&1 || true
  echo "postgres stopped"
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  reset) stop; rm -rf "$DATA"; start ;;
  status) "$PG_BIN/pg_ctl" -D "$DATA" status || true ;;
  *) echo "usage: $0 start|stop|reset|status" >&2; exit 2 ;;
esac
