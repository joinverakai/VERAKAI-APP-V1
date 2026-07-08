#!/bin/zsh
set -e

REPO_URL="$1"

if [ -z "$REPO_URL" ]; then
  echo "Paste the GitHub repo URL for VERAKAI APP V1:"
  read REPO_URL
fi

if [ -z "$REPO_URL" ]; then
  echo "No repo URL provided. Nothing was pushed."
  exit 1
fi

git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
git branch -M main
git push -u origin main
