#!/bin/bash
# Build script for OpenList lite version - optimized with caching & parallelism

set -e

cd "$(dirname "$0")"

OUTPUT_DIR="./output"
mkdir -p "$OUTPUT_DIR"

# Go build cache optimization
export GOCACHE="${GOCACHE:-$(go env GOCACHE)}"
export GOMODCACHE="${GOMODCACHE:-$(go env GOMODCACHE)}"
export GOFLAGS="${GOFLAGS} -trimpath"

# Pre-download Go modules (cache them)
echo "[0/4] Downloading Go modules..."
go mod download

# Build frontend with cache
echo "[1/4] Building frontend..."
cd OpenList-Frontend
if [ ! -d node_modules ]; then
  npm install --prefer-offline --no-audit --no-fund
else
  # Only reinstall if package-lock.json changed
  npm ci --prefer-offline --no-audit --no-fund 2>/dev/null || npm install --prefer-offline --no-audit --no-fund
fi
npm run build
cd ..

echo "[2/4] Copying frontend assets..."
rm -rf public/dist
cp -r OpenList-Frontend/dist public/dist

# Build function (runs in background for parallelism)
build() {
    local GOOS=$1
    local GOARCH=$2
    local GOARM=$3
    local OUTPUT_NAME=$4

    echo "Building for $GOOS/$GOARCH${GOARM:+/$GOARM}..."

    export GOOS=$GOOS
    export GOARCH=$GOARCH
    if [ -n "$GOARM" ]; then
        export GOARM=$GOARM
    else
        unset GOARM
    fi

    CGO_ENABLED=0 go build -tags="lite,jsoniter" -ldflags="-s -w" -o "$OUTPUT_DIR/$OUTPUT_NAME" .

    # Optional: UPX compression (slow, disable with SKIP_UPX=1)
    if [ -z "${SKIP_UPX}" ] && command -v upx >/dev/null 2>&1; then
        upx --best --lzma "$OUTPUT_DIR/$OUTPUT_NAME" 2>/dev/null || true
    fi

    echo "  -> $OUTPUT_DIR/$OUTPUT_NAME"
}

echo "[3/4] Cross-compiling (sequential)..."

# Windows builds
build windows 386 "" "openlist-windows-386.exe"
build windows amd64 "" "openlist-windows-amd64.exe"
build windows arm64 "" "openlist-windows-arm64.exe"

# Linux builds
build linux 386 "" "openlist-linux-386"
build linux amd64 "" "openlist-linux-amd64"
build linux arm64 "" "openlist-linux-arm64"
build linux arm 5 "openlist-linux-arm5"
build linux arm 6 "openlist-linux-arm6"
build linux arm 7 "openlist-linux-arm7"

# Android builds
build linux amd64 "" "openlist-android-amd64"
build linux arm64 "" "openlist-android-arm64-v8a"
build linux 386 "" "openlist-android-386"
build linux arm 7 "openlist-android-armeabi-v7a"

# Compress all binaries to .tar.gz (parallel)
echo "[4/4] Compressing binaries..."
cd "$OUTPUT_DIR"
for f in *; do
    if [ -f "$f" ] && [[ ! "$f" =~ \.tar\.gz$ ]]; then
        tar -czf "${f}.tar.gz" "$f" &
    fi
done
wait

echo "=== All builds completed ==="
ls -la *.tar.gz