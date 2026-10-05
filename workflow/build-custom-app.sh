#!/bin/bash
# =============================================================================
# OpenList-Mobile 一键构建脚本（使用 ./OpenList 定制精简版源代码）
#
#   用法:  ./build-custom-app.sh [版本号]
#   示例:  ./build-custom-app.sh 5.2.1        # 默认 5.2.1
#
#   流程:  同步定制源码 -> gomobile bind 生成 AAR -> flutter 构建 APK
#          -> 产物移动到 ./app-build -> 脚本结束
#
#   依赖环境变量(可选覆盖): FLUTTER_BIN / ANDROID_HOME / GOMOBILE_BIN / GOPROXY
#   默认值与本机环境一致:
#     flutter:      /opt/flutter/bin/flutter
#     Android SDK:  /opt/android-sdk (需含 ndk/27.0.12077973 与 platforms/android-35)
#     gomobile:     $HOME/go/bin/gomobile
# =============================================================================
set -euo pipefail

APP_VERSION="${1:-5.2.1}"                                    # APK 版本名
OPENLIST_TAG="v${APP_VERSION#v}"                             # 注入 About 页的 OpenList 版本
OPENLIST_VERSION_STR="${OPENLIST_TAG} (Yorix Custom Edition)" # 注入后端 conf.Version 的完整版本

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"  # 仓库根
CUSTOM_SRC="${CUSTOM_SRC:-$PROJECT_DIR/OpenList}"
APP_DIR="${APP_DIR:-$PROJECT_DIR/A-OpenList-Mobile}"           # Flutter 项目目录
STAGE_DIR="$APP_DIR/openlist-lib"
ANDROID_DIR="$APP_DIR/android"
LIBS_DIR="$ANDROID_DIR/app/libs"
OUT_DIR="$APP_DIR/app-build"

FLUTTER_BIN="${FLUTTER_BIN:-/opt/flutter/bin/flutter}"
GOMOBILE_BIN="${GOMOBILE_BIN:-$HOME/go/bin/gomobile}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$(dirname "$FLUTTER_BIN"):$HOME/go/bin:$PATH"
export GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"
export GOFLAGS=-mod=mod   # 允许构建时自动补全 go.sum（同步回的 go.mod 需要新增 x/mobile 依赖）
export GRADLE_OPTS="-Dorg.gradle.daemon=false"
export BUILD_VERSION_NAME="$APP_VERSION"

step() { echo; echo "==> $*"; }
info() { echo "    $*"; }
fail() { echo "!!! $*" >&2; exit 1; }

# ----------------------------------------------------------------------------
step "[0/5] 环境检查"
# ----------------------------------------------------------------------------
[ -d "$CUSTOM_SRC" ]  || fail "未找到定制源码目录: $CUSTOM_SRC"
[ -x "$FLUTTER_BIN" ] || fail "未找到 Flutter: $FLUTTER_BIN (可用 FLUTTER_BIN 覆盖)"
[ -x "$GOMOBILE_BIN" ] || fail "未找到 gomobile: $GOMOBILE_BIN (go install golang.org/x/mobile/cmd/gomobile@latest)"
[ -d "$ANDROID_HOME/ndk/27.0.12077973" ] || fail "缺少 NDK 27.0.12077973: $ANDROID_HOME/ndk/"
command -v go >/dev/null || fail "缺少 go 工具链"
info "版本号: $APP_VERSION (后端内嵌: $OPENLIST_VERSION_STR)"
info "源码:    $CUSTOM_SRC  ->  $STAGE_DIR"

# ----------------------------------------------------------------------------
step "[1/5] 同步定制源码到构建暂存区 openlist-lib/"
# ----------------------------------------------------------------------------
# 覆盖式同步；保留暂存区自带的 openlistlib/ 与 scripts/（gomobile 绑定代码）
tar -C "$CUSTOM_SRC" \
    --exclude='./A-OpenList-Frontend' \
    --exclude='./A-OpenList-Mobile' \
    --exclude='./dist' \
    --exclude='./bin' \
    --exclude='./data' \
    --exclude='./.zcode' \
    --exclude='./.github' \
    --exclude='./docker-context' \
    --exclude='./run.log' \
    --exclude='*node_modules*' \
    -cf - . | tar -C "$STAGE_DIR" -xf -
info "源码同步完成 ($(du -sh "$STAGE_DIR" | cut -f1))"

# ----------------------------------------------------------------------------
step "[2/5] gomobile bind 生成 Android AAR"
# ----------------------------------------------------------------------------
cd "$STAGE_DIR"
# gomobile 需要模块内显式依赖 bind 包（与官方 CI 的 init_gomobile.sh 一致）
grep -q "golang.org/x/mobile" go.mod || go get golang.org/x/mobile/bind@latest >/dev/null
go build ./openlistlib/... || fail "openlistlib 编译失败"

builtAt="$(date +'%F %T %z')"
ldflags="-s -w"
ldflags="$ldflags -X 'github.com/OpenListTeam/OpenList/v4/internal/conf.BuiltAt=$builtAt'"
ldflags="$ldflags -X 'github.com/OpenListTeam/OpenList/v4/internal/conf.GitAuthor=The OpenList Projects Contributors <noreply@openlist.team>'"
ldflags="$ldflags -X 'github.com/OpenListTeam/OpenList/v4/internal/conf.GitCommit=local'"
ldflags="$ldflags -X 'github.com/OpenListTeam/OpenList/v4/internal/conf.Version=$OPENLIST_VERSION_STR'"
ldflags="$ldflags -X 'github.com/OpenListTeam/OpenList/v4/internal/conf.WebVersion=local'"

rm -f "$LIBS_DIR"/openlistlib.aar "$LIBS_DIR"/openlistlib-sources.jar
cd "$STAGE_DIR/openlistlib"
"$GOMOBILE_BIN" bind -ldflags "$ldflags" -androidapi 21 -target=android/arm,android/arm64,android/amd64
mkdir -p "$LIBS_DIR"
mv -f ./*.aar ./*.jar "$LIBS_DIR"
info "AAR -> $LIBS_DIR ($(ls -lh "$LIBS_DIR"/openlistlib.aar | awk '{print $5}'))"

# ----------------------------------------------------------------------------
step "[3/5] 准备版本号与签名配置"
# ----------------------------------------------------------------------------
printf '%s\n' "$OPENLIST_TAG" > "$APP_DIR/openlist_version"
info "openlist_version -> $OPENLIST_TAG (BuildConfig.OPENLIST_VERSION / About 页)"

if [ ! -f "$ANDROID_DIR/app/key.jks" ]; then
    keytool -genkeypair -keystore "$ANDROID_DIR/app/key.jks" -storetype JKS \
        -keyalg RSA -keysize 2048 -validity 10000 -alias openlist \
        -storepass openlist123 -keypass openlist123 \
        -dname "CN=OpenList Custom, OU=Yorix, O=Yorix, L=Beijing, ST=Beijing, C=CN" >/dev/null 2>&1
    info "已生成签名密钥: android/app/key.jks"
fi
LP="$ANDROID_DIR/local.properties"
touch "$LP"
grep -q '^sdk.dir=' "$LP"      || echo "sdk.dir=$ANDROID_HOME" >> "$LP"
grep -q '^flutter.sdk=' "$LP"  || echo "flutter.sdk=$(dirname "$(dirname "$FLUTTER_BIN")")" >> "$LP"
grep -q '^KEY_PATH=' "$LP"     || { cat >> "$LP" <<'EOF'
KEY_PATH=./key.jks
KEY_PASSWORD=openlist123
ALIAS_NAME=openlist
ALIAS_PASSWORD=openlist123
EOF
info "已写入签名配置到 android/local.properties"; }

# ----------------------------------------------------------------------------
step "[4/5] flutter 构建 APK (release, split-per-abi)"
# ----------------------------------------------------------------------------
cd "$APP_DIR"
"$FLUTTER_BIN" pub get >/dev/null
"$FLUTTER_BIN" build apk --release --split-per-abi \
    --target-platform android-arm,android-arm64,android-x64

# ----------------------------------------------------------------------------
step "[5/5] 产物移动到 ./app-build/"
# ----------------------------------------------------------------------------
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
mv -f "$APP_DIR"/build/app/outputs/apk/release/*.apk "$OUT_DIR"/
info "构建完成，产物:"
ls -lh "$OUT_DIR"/*.apk | awk '{print "    " $NF "  (" $5 ")"}'
echo
echo "==> 完成 ($(date +'%F %T'))"
exit 0
