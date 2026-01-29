#!/bin/bash
# Script para enviar o Kronus ao GitHub
# Execute no terminal: bash push-to-github.sh

set -e
cd "$(dirname "$0")"

echo "→ Inicializando Git (se necessário)..."
if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "Initial commit - Kronus Ponto Eletrônico"
  echo "✓ Repositório criado e primeiro commit feito."
else
  echo "✓ Repositório já existe."
  if [ -n "$(git status --porcelain)" ]; then
    git add .
    git commit -m "Update - Kronus" || true
  fi
fi

echo "→ Configurando remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/narleysousa/Kronus.git

echo "→ Enviando para GitHub (main)..."
git branch -M main
git push -u origin main

echo "✓ Concluído! Repo: https://github.com/narleysousa/Kronus"
