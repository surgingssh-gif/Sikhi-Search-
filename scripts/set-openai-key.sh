#!/bin/sh
# Saves your OpenAI API key into .env without showing it on screen. The key is
# only used to paint the daily paper's illustrations.
# Usage: sh scripts/set-openai-key.sh
set -e
cd "$(dirname "$0")/.."
[ -f .env ] || cp .env.example .env

printf "Paste your OpenAI API key (it won't be shown), then press Return: "
stty -echo
read -r key
stty echo
printf "\n"

case "$key" in
  sk-*) ;;
  "") echo "Nothing was pasted. .env is unchanged."; exit 1 ;;
  *) echo "That doesn't look like an OpenAI key (they start with sk-). .env is unchanged."; exit 1 ;;
esac

tmp=$(mktemp)
grep -v '^OPENAI_API_KEY=' .env > "$tmp" || true
printf 'OPENAI_API_KEY=%s\n' "$key" >> "$tmp"
mv "$tmp" .env
chmod 600 .env
echo "Saved to .env (${#key} characters)."
