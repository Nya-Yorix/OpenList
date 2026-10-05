#!/usr/bin/env bash
# build-all.sh — 交叉编译各平台二进制
#
# 用法:
#   ./build-all.sh                # 构建全部目标, 各自打包为 .tar.gz 并删除原始二进制
#   ./build-all.sh windows        # 仅构建名称含 "windows" 的目标(可多个关键字)
#   ./build-all.sh --no-archive   # 只编译, 不打包(保留原始二进制)
#   ./build-all.sh --keep-raw     # 打包后保留原始二进制
#
# 环境变量:
#   ROOT_DIR    Go 项目根目录 (默认 <脚本目录>/.., 即仓库根)
#   OUT_DIR     输出目录 (默认 <项目>/dist)
#   VERSION     注入的 Version (默认 local)
#   WEBVERSION  注入的 WebVersion (默认 local)
#
# 打包: 每个目标额外生成 <目标名>.tar.gz, 归档内二进制统一命名为 openlist
#       (windows 为 openlist.exe), 与原 build.sh 的发布约定一致。
#       打包成功后默认删除原始二进制, 仅保留 .tar.gz (用 --keep-raw 保留)。
#
# 说明:
#   - 全部使用 CGO_ENABLED=0 纯静态交叉编译(项目默认 sqlite 驱动为纯 Go 的 glebarez)。
#     例外: windows/386 因构建约束会选用 gorm(mattn/go-sqlite3, 需 cgo) 驱动,
#     在 CGO_ENABLED=0 下可编译但 sqlite 运行时不具备功能。
#   - android-* 目标按上游约定使用 GOOS=linux(对应 Termux/Android), 与同名 linux 目标内容一致。
# 退出码: 0=全部成功, 1=有目标或打包失败
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${ROOT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
OUT_DIR="${OUT_DIR:-$PROJECT_DIR/dist}"
VERSION="${VERSION:-local}"
WEBVERSION="${WEBVERSION:-local}"
BUILD_TAGS="jsoniter"
DO_ARCHIVE=1
KEEP_RAW=0

info()  { printf '\033[32m[INFO]\033[0m  %s\n' "$*"; }
warn()  { printf '\033[33m[WARN]\033[0m  %s\n' "$*"; }
error() { printf '\033[31m[ERROR]\033[0m %s\n' "$*" >&2; }
step()  { printf '\n\033[36m==> %s\033[0m\n' "$*"; }

cd "$PROJECT_DIR" || { error "无法进入项目目录: $PROJECT_DIR"; exit 1; }
command -v go >/dev/null 2>&1 || { error "未找到 go"; exit 1; }
mkdir -p "$OUT_DIR"

builtAt="$(date +'%F %T %z')"
LDFLAGS="-w -s \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.BuiltAt=$builtAt' \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.GitAuthor=The OpenList Projects Contributors <noreply@openlist.team>' \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.GitCommit=local' \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.Version=$VERSION' \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.WebVersion=$WEBVERSION'"

FAILED=0
OK=0
FAIL_LIST=()

# build <os> <arch> <goarm> <output>
build() {
  local goos="$1" goarch="$2" goarm="$3" out="$4"
  local target="${goos}/${goarch}${goarm:+/v$goarm}"
  info "-> $out  ($target, CGO_ENABLED=0)"

  local log rc attempt
  log="$(CGO_ENABLED=0 GOOS="$goos" GOARCH="$goarch" GOARM="$goarm" \
         go build -o "$OUT_DIR/$out" -ldflags="$LDFLAGS" -tags="$BUILD_TAGS" . 2>&1)"
  rc=$?
  attempt=1
  while [ "$rc" -ne 0 ] && [ "$attempt" -le 2 ]; do
    if printf '%s' "$log" | grep -qE 'panic:|cmd/link|internal/loader'; then
      warn "  链接器内部错误, go clean -cache 后重试 (第 $attempt 次)"
      go clean -cache
    else
      warn "  编译失败, 重试 (第 $attempt 次)"
    fi
    log="$(CGO_ENABLED=0 GOOS="$goos" GOARCH="$goarch" GOARM="$goarm" \
           go build -o "$OUT_DIR/$out" -ldflags="$LDFLAGS" -tags="$BUILD_TAGS" . 2>&1)"
    rc=$?
    attempt=$((attempt + 1))
  done

  if [ "$rc" -ne 0 ]; then
    error "  失败: $out"
    printf '%s\n' "$log" | sed 's/^/    /' >&2
    FAILED=$((FAILED + 1)); FAIL_LIST+=("$out")
  else
    info "  ok: $out ($(du -h "$OUT_DIR/$out" | cut -f1))"
    OK=$((OK + 1))
    [ "$DO_ARCHIVE" -eq 1 ] && make_archive "$out"
  fi
}

# 将目标二进制打包为 .tar.gz (归档内统一命名 openlist / openlist.exe)
ARCH_FAILED=0
make_archive() {
  local out="$1" base inner stage
  base="${out%.exe}"
  case "$out" in *.exe) inner="openlist.exe" ;; *) inner="openlist" ;; esac
  stage="$(mktemp -d)" || { error "  打包失败(mktemp): $out"; ARCH_FAILED=1; return; }
  cp "$OUT_DIR/$out" "$stage/$inner" || { rm -rf "$stage"; error "  打包失败(cp): $out"; ARCH_FAILED=1; return; }
  if tar -czf "$OUT_DIR/${base}.tar.gz" -C "$stage" "$inner"; then
    info "  archive: ${base}.tar.gz ($(du -h "$OUT_DIR/${base}.tar.gz" | cut -f1))"
    if [ "$KEEP_RAW" -eq 0 ]; then
      rm -f "$OUT_DIR/$out" && info "  removed raw: $out"
    fi
  else
    error "  打包失败: ${base}.tar.gz"; ARCH_FAILED=1
  fi
  rm -rf "$stage"
}

# 关键字过滤(可选): 无参数则构建全部
FILTERS=()
for a in "$@"; do
  case "$a" in
    --no-archive) DO_ARCHIVE=0 ;;
    --keep-raw) KEEP_RAW=1 ;;
    -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
    -*) error "未知参数: $a"; exit 1 ;;
    *) FILTERS+=("$a") ;;
  esac
done
want() {
  local name="$1"
  [ "${#FILTERS[@]}" -eq 0 ] && return 0
  for kw in "${FILTERS[@]}"; do case "$name" in *"$kw"*) return 0 ;; esac; done
  return 1
}

step "构建目标 -> $OUT_DIR"

# ===== Windows builds =====
want "openlist-windows-386.exe"      && build windows 386  "" "openlist-windows-386.exe"
want "openlist-windows-amd64.exe"    && build windows amd64 "" "openlist-windows-amd64.exe"
want "openlist-windows-arm64.exe"    && build windows arm64 "" "openlist-windows-arm64.exe"

# ===== Linux builds =====
want "openlist-linux-386"   && build linux 386  "" "openlist-linux-386"
want "openlist-linux-amd64" && build linux amd64 "" "openlist-linux-amd64"
want "openlist-linux-arm64" && build linux arm64 "" "openlist-linux-arm64"
want "openlist-linux-arm5"  && build linux arm 5 "openlist-linux-arm5"
want "openlist-linux-arm6"  && build linux arm 6 "openlist-linux-arm6"
want "openlist-linux-arm7"  && build linux arm 7 "openlist-linux-arm7"

# ===== Android builds (GOOS=linux) =====
want "openlist-android-amd64"        && build linux amd64 "" "openlist-android-amd64"
want "openlist-android-arm64-v8a"    && build linux arm64 "" "openlist-android-arm64-v8a"
want "openlist-android-386"          && build linux 386  "" "openlist-android-386"
want "openlist-android-armeabi-v7a"  && build linux arm 7 "openlist-android-armeabi-v7a"

# ===== 汇总 =====
step "结果"
printf '编译成功: %d  失败: %d\n' "$OK" "$FAILED"
if [ "$DO_ARCHIVE" -eq 1 ]; then
  if [ "$KEEP_RAW" -eq 0 ]; then echo "原始二进制已删除, 仅保留归档:"; else echo "生成的归档(原始二进制保留):"; fi
  ls -la "$OUT_DIR"/*.tar.gz 2>/dev/null || true
fi
if [ "$FAILED" -ne 0 ]; then
  error "以下目标编译失败: ${FAIL_LIST[*]}"
  exit 1
fi
if [ "$ARCH_FAILED" -ne 0 ]; then
  error "存在打包失败项"
  exit 1
fi
printf '\033[32m✔ 全部目标构建成功\033[0m (%s)\n' "$OUT_DIR"
exit 0
