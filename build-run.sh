#!/usr/bin/env bash
# build-run.sh — 一键编译并重启 OpenList
#
# 用法:
#   ./build-run.sh                # 编译后端并重启
#   ./build-run.sh --frontend     # 先构建前端(pnpm)同步到 public/dist, 再编译后端并重启
#
# 环境变量:
#   OPENLIST_HTTP_PORT      运行端口 (默认 5266)
#   OPENLIST_DATA_DIR       数据目录 (默认 <项目>/data)
#   OPENLIST_ADMIN_PASSWORD 首次初始化时的管理员密码 (默认 OpenList@2026)
#
# 说明: 只关注是否成功启动(编译通过 + 进程存活 + 端口监听 + /ping 通);
#       用户存储/配置类的运行期报错(如远程存储超时)不影响判定。
# 退出码: 0=成功, 1=失败
set -uo pipefail

# ---------------- 配置 ----------------
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${OPENLIST_DATA_DIR:-$PROJECT_DIR/data}"
BIN_DIR="$PROJECT_DIR/bin"
BIN="$BIN_DIR/openlist"
TMP_BIN="$BIN_DIR/openlist.new"
PIDFILE="$BIN_DIR/openlist.pid"
LOGFILE="$PROJECT_DIR/run.log"
HTTP_PORT="${OPENLIST_HTTP_PORT:-5266}"
ADMIN_USER="admin"
ADMIN_PASS="${OPENLIST_ADMIN_PASSWORD:-OpenList@2026}"
BUILD_TAGS="jsoniter"
FRONTEND_DIR="$PROJECT_DIR/A-OpenList-Frontend"
BASE_URL="http://127.0.0.1:${HTTP_PORT}"

DO_FRONTEND=0
for arg in "$@"; do
  case "$arg" in
    --frontend) DO_FRONTEND=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "未知参数: $arg" >&2; exit 1 ;;
  esac
done

# ---------------- 输出helpers ----------------
info()  { printf '\033[32m[INFO]\033[0m  %s\n' "$*"; }
warn()  { printf '\033[33m[WARN]\033[0m  %s\n' "$*"; }
error() { printf '\033[31m[ERROR]\033[0m %s\n' "$*" >&2; }
step()  { printf '\n\033[36m==> %s\033[0m\n' "$*"; }
fail()  { error "$*"; exit 1; }

# 取监听指定端口的进程 PID
port_pid() {
  ss -ltnp 2>/dev/null \
    | awk -v p=":${HTTP_PORT}" '$4 ~ p {print $NF}' \
    | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2
}

cd "$PROJECT_DIR" || fail "无法进入项目目录: $PROJECT_DIR"
mkdir -p "$BIN_DIR"

# ---------------- 0. (可选) 前端 ----------------
if [ "$DO_FRONTEND" -eq 1 ]; then
  step "0/4 构建前端"
  command -v pnpm >/dev/null 2>&1 || fail "未找到 pnpm，无法构建前端"
  [ -d "$FRONTEND_DIR" ] || fail "前端目录不存在: $FRONTEND_DIR"
  ( cd "$FRONTEND_DIR" && pnpm install && pnpm build ) || fail "前端构建失败"
  rm -rf "$PROJECT_DIR/public/dist"
  cp -a "$FRONTEND_DIR/dist" "$PROJECT_DIR/public/dist" || fail "同步前端产物到 public/dist 失败"
  info "前端产物已同步到 public/dist"
else
  info "跳过后端前端构建 (需要时用 --frontend)"
fi

# ---------------- 1. 编译后端 ----------------
step "1/4 编译后端"
builtAt="$(date +'%F %T %z')"
LDFLAGS="-w -s \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.BuiltAt=$builtAt' \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.GitAuthor=The OpenList Projects Contributors <noreply@openlist.team>' \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.GitCommit=local' \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.Version=v5.2.0 (Yorix Custom Edition)' \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.WebVersion=local'"

do_build() { go build -o "$TMP_BIN" -ldflags="$LDFLAGS" -tags="$BUILD_TAGS" . 2>&1; }

build_log="$(do_build)"
build_rc=$?

# 链接器坏缓存自动修复: go clean -cache 后有限次重试
attempt=1
while [ "$build_rc" -ne 0 ] && [ "$attempt" -le 2 ]; do
  if printf '%s' "$build_log" | grep -qE 'panic:|cmd/link|internal/loader'; then
    warn "检测到链接器内部错误(通常是构建缓存损坏)，执行 go clean -cache 后重试 (第 $attempt 次重试)"
    go clean -cache
  else
    warn "编译失败，重试 (第 $attempt 次重试)"
  fi
  build_log="$(do_build)"
  build_rc=$?
  attempt=$((attempt + 1))
done

if [ "$build_rc" -ne 0 ]; then
  printf '%s\n' "$build_log" >&2
  fail "编译失败(已重试)。"
fi
[ -n "$build_log" ] && printf '%s\n' "$build_log"
[ -x "$TMP_BIN" ] || fail "编译命令返回成功，但未生成二进制: $TMP_BIN"
info "编译成功: $(du -h "$TMP_BIN" | cut -f1)"

# ---------------- 2. 停止旧实例 ----------------
step "2/4 停止旧实例"
old_pid=""
[ -f "$PIDFILE" ] && old_pid="$(cat "$PIDFILE" 2>/dev/null || true)"
if [ -z "${old_pid:-}" ] || ! kill -0 "$old_pid" 2>/dev/null; then
  old_pid="$(port_pid)"
fi

if [ -n "${old_pid:-}" ] && kill -0 "$old_pid" 2>/dev/null; then
  info "停止旧实例 PID=$old_pid"
  kill "$old_pid" 2>/dev/null
  for _ in $(seq 1 20); do kill -0 "$old_pid" 2>/dev/null || break; sleep 0.5; done
  if kill -0 "$old_pid" 2>/dev/null; then
    warn "优雅停止超时，强制 kill -9"
    kill -9 "$old_pid" 2>/dev/null; sleep 1
  fi
else
  info "没有正在运行的旧实例"
fi
rm -f "$PIDFILE"

# ---------------- 3. 切换二进制并启动 ----------------
step "3/4 启动新实例"
mv -f "$TMP_BIN" "$BIN" || fail "替换二进制失败(是否被占用?)"
chmod +x "$BIN"
info "启动: $BIN server --data $DATA_DIR (端口 $HTTP_PORT)"

nohup env OPENLIST_ADMIN_PASSWORD="$ADMIN_PASS" OPENLIST_HTTP_PORT="$HTTP_PORT" \
  "$BIN" server --data "$DATA_DIR" > "$LOGFILE" 2>&1 < /dev/null &
new_pid=$!
echo "$new_pid" > "$PIDFILE"

# 等待端口就绪
up=0
for _ in $(seq 1 40); do
  if [ "$(curl -s -m 2 -o /dev/null -w '%{http_code}' "$BASE_URL/ping" 2>/dev/null)" = "200" ]; then
    up=1; break
  fi
  sleep 0.5
done
if [ "$up" -ne 1 ]; then
  echo "----- run.log -----" >&2
  tail -30 "$LOGFILE" >&2
  fail "服务未在预期时间内就绪，请查看 $LOGFILE"
fi
info "服务已就绪 (PID=$new_pid, PPID=$(ps -o ppid= -p "$new_pid" 2>/dev/null | tr -d ' '))"

# ---------------- 4. 启动自检 ----------------
step "4/4 启动自检"
if ! kill -0 "$new_pid" 2>/dev/null; then
  echo "----- run.log -----" >&2
  tail -30 "$LOGFILE" >&2
  fail "进程已退出"
fi
ping_body="$(curl -s -m 5 "$BASE_URL/ping")"
[ "$ping_body" = "pong" ] || fail "健康检查失败: /ping 返回 '$ping_body'"
info "进程存活 (PID=$new_pid)"
info "/ping -> pong"
info "首页 -> $(curl -s -m 5 "$BASE_URL/" | grep -o '<title>[^<]*</title>' | head -1)"

echo
printf '\033[32m✔ 编译并运行成功\033[0m\n'
printf '  二进制 : %s\n' "$BIN"
printf '  进程   : PID %s\n' "$new_pid"
printf '  端口   : %s\n' "$HTTP_PORT"
printf '  地址   : %s  /  %s\n' "$BASE_URL" "http://$(hostname -I 2>/dev/null | awk '{print $1}'):${HTTP_PORT}"
printf '  凭据   : %s / %s\n' "$ADMIN_USER" "$ADMIN_PASS"
printf '  日志   : %s\n' "$LOGFILE"
exit 0
