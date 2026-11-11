#!/bin/sh
# Publica dist/ en la rama gh-pages (GitHub Pages). Los assets de terceros
# solo existen localmente (assets-raw/), por eso se compila aquí y no en CI.
set -e
npm run build
cd dist
touch .nojekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
