#!/bin/bash
# OpenList-least 本地一键构建脚本
# 用法: ./build.sh   （构建前端 + 编译后端二进制）
set -e
cd "$(dirname "$0")"

echo "[1/4] 构建前端..."
cd OpenList-Frontend
if [ ! -d node_modules ]; then
  npm install
fi
npm run build
cd ..

echo "[2/4] 复制前端产物到 public/dist..."
rm -rf public/dist
cp -r OpenList-Frontend/dist public/dist

echo "[3/4] 编译后端二进制..."
CGO_ENABLED=0 go build -o bin/openlist -tags=jsoniter -ldflags="-s -w" .

echo "[4/4] 压缩二进制..."
if command -v upx >/dev/null 2>&1; then
  upx --best --lzma bin/openlist
else
  strip bin/openlist 2>/dev/null || true
fi

echo "构建完成: bin/openlist"
echo "启动命令: ./bin/openlist server"