#!/bin/sh
set -eu

cd /workspace

export NODE_PATH="/workspace/backend/node_modules:/workspace/frontend/node_modules:/workspace/shared/node_modules:/workspace/node_modules${NODE_PATH:+:$NODE_PATH}"

deps_marker_suffix=$(node -p 'process.platform + "-" + process.arch + "-node" + process.versions.node.split(".")[0]')
deps_marker="/workspace/node_modules/.app-docker-deps-v1-$deps_marker_suffix"

if [ ! -f "$deps_marker" ]; then
  npm ci
  (cd backend && npm rebuild sqlite3 --build-from-source)
  touch "$deps_marker"
fi

if [ ! -e /workspace/node_modules/sqlite3 ] && [ -e /workspace/backend/node_modules/sqlite3 ]; then
  ln -s /workspace/backend/node_modules/sqlite3 /workspace/node_modules/sqlite3
fi

case "$1" in
  backend)
    npm run build --workspace shared
    cd backend
    ../node_modules/.bin/tsc -p tsconfig.json
    exec node ./node_modules/@nestjs/cli/bin/nest.js start --watch --entryFile main
    ;;
  backend-debug)
    npm run build --workspace shared
    cd backend
    ../node_modules/.bin/tsc -p tsconfig.json
    exec node ./node_modules/@nestjs/cli/bin/nest.js start --debug 0.0.0.0:9229 --watch --entryFile main
    ;;
  frontend)
    npm run build --workspace shared
    cd frontend
    exec node ./node_modules/vite/bin/vite.js
    ;;
  *)
    echo "Unknown dev bootstrap target: $1" >&2
    exit 1
    ;;
esac
