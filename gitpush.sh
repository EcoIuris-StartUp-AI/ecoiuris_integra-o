#!/bin/zsh

echo "🔎 Adicionando mudanças..."
git add .

echo "✍️ Digite a mensagem do commit:"
read commit_message

git commit -m "$commit_message" || echo "⚠️ Nada novo para commitar"

echo "🚀 Subindo para GitHub..."
git push -u origin main
