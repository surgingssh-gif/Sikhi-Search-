#!/bin/sh
# Saves your Anthropic API key into .env without showing it on screen.
# Usage: sh scripts/set-api-key.sh
set -e
cd "$(dirname "$0")/.."
[ -f .env ] || cp .env.example .env

printf "Paste your Anthropic API key (it won't be shown), then press Return: "
stty -echo
read -r key
stty echo
printf "\n"

case "$key" in
  sk-ant-*) ;;
  "") echo "Nothing was pasted. .env is unchanged."; exit 1 ;;
  *) echo "That doesn't look like an Anthropic key (they start with sk-ant-). .env is unchanged."; exit 1 ;;
esac

tmp=$(mktemp)
grep -v '^ANTHROPIC_API_KEY=' .env > "$tmp" || true
printf 'ANTHROPIC_API_KEY=%s\n' "$key" >> "$tmp"
mv "$tmp" .env
chmod 600 .env
echo "Saved to .env (${#key} characters)."
