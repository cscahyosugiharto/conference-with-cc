#!/usr/bin/env bash
# Copy static site into ./public for Cloudflare Pages (functions/ is compiled by wrangler).
set -euo pipefail
cd "$(dirname "$0")"
rm -rf public && mkdir -p public
cp -r index.html admin.html 404.html styles.css favicon.svg *.js assets vendor public/
