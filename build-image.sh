#!/usr/bin/env bash
# build-image.sh — 编译静态二进制并构建 Docker 镜像(scratch, 无需基础镜像)
#
# 用法:
#   ./build-image.sh                 # 静态编译 + 构建镜像 + 启动容器自检
#   ./build-image.sh --no-verify     # 只构建镜像, 不做容器启动自检
#
# 环境变量:
#   IMAGE    镜像标签 (默认 openlist:yorix)
#
# 退出码: 0=成功, 1=失败
set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CTX="$PROJECT_DIR/docker-context"
IMAGE="${IMAGE:-openlist:yorix}"
DOCKERFILE_SRC="$PROJECT_DIR/Dockerfile.static"
BUILD_TAGS="jsoniter"
VERIFY_PORT=15277
DO_VERIFY=1

for a in "$@"; do
  case "$a" in
    --no-verify) DO_VERIFY=0 ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "未知参数: $a" >&2; exit 1 ;;
  esac
done

info()  { printf '\033[32m[INFO]\033[0m  %s\n' "$*"; }
warn()  { printf '\033[33m[WARN]\033[0m  %s\n' "$*"; }
error() { printf '\033[31m[ERROR]\033[0m %s\n' "$*" >&2; }
step()  { printf '\n\033[36m==> %s\033[0m\n' "$*"; }
fail()  { error "$*"; exit 1; }

cd "$PROJECT_DIR" || fail "无法进入项目目录: $PROJECT_DIR"

command -v docker >/dev/null 2>&1 || fail "未找到 docker"
docker info >/dev/null 2>&1 || fail "docker 守护进程不可用"
[ -f "$DOCKERFILE_SRC" ] || fail "缺少 $DOCKERFILE_SRC"

# ---------------- 1. 静态编译 ----------------
step "1/4 编译静态二进制 (CGO_ENABLED=0)"
mkdir -p "$CTX"
builtAt="$(date +'%F %T %z')"
LDFLAGS="-w -s \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.BuiltAt=$builtAt' \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.GitAuthor=The OpenList Projects Contributors <noreply@openlist.team>' \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.GitCommit=local' \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.Version=local' \
-X 'github.com/OpenListTeam/OpenList/v4/internal/conf.WebVersion=local'"

do_build() { CGO_ENABLED=0 go build -o "$CTX/openlist" -ldflags="$LDFLAGS" -tags="$BUILD_TAGS" . 2>&1; }

build_log="$(do_build)"; rc=$?
attempt=1
while [ "$rc" -ne 0 ] && [ "$attempt" -le 2 ]; do
  if printf '%s' "$build_log" | grep -qE 'panic:|cmd/link|internal/loader'; then
    warn "检测到链接器内部错误(构建缓存损坏), 执行 go clean -cache 后重试 (第 $attempt 次)"
    go clean -cache
  else
    warn "编译失败, 重试 (第 $attempt 次)"
  fi
  build_log="$(do_build)"; rc=$?
  attempt=$((attempt + 1))
done
if [ "$rc" -ne 0 ]; then
  printf '%s\n' "$build_log" >&2
  fail "静态编译失败(已重试)。"
fi
[ -n "$build_log" ] && printf '%s\n' "$build_log"
file "$CTX/openlist" | grep -q "statically linked" || fail "产物不是静态链接, 无法用于 scratch 镜像"
info "静态二进制就绪: $(du -h "$CTX/openlist" | cut -f1)"

# ---------------- 2. 准备构建上下文 ----------------
step "2/4 准备构建上下文 (CA 证书 / 时区数据)"
[ -f /etc/ssl/certs/ca-certificates.crt ] || fail "缺少 /etc/ssl/certs/ca-certificates.crt"
cp -f /etc/ssl/certs/ca-certificates.crt "$CTX/ca-certificates.crt"
[ -d /usr/share/zoneinfo ] || fail "缺少 /usr/share/zoneinfo"
rm -rf "$CTX/zoneinfo"
cp -a /usr/share/zoneinfo "$CTX/zoneinfo"
cp -f "$DOCKERFILE_SRC" "$CTX/Dockerfile"
info "上下文就绪: $CTX"

# ---------------- 3. 构建镜像 ----------------
step "3/4 构建镜像 $IMAGE"
docker build -t "$IMAGE" "$CTX" || fail "docker build 失败"
info "镜像构建成功:"
docker images --format '  {{.Repository}}:{{.Tag}}  {{.Size}}  {{.ID}}' "$IMAGE" 2>/dev/null || docker images "$IMAGE"

# ---------------- 4. 容器启动自检 ----------------
if [ "$DO_VERIFY" -eq 1 ]; then
  step "4/4 容器启动自检"
  cname="openlist_imgcheck_$$"
  docker rm -f -v "$cname" >/dev/null 2>&1 || true
  docker run -d --name "$cname" -p "${VERIFY_PORT}:5244" -e TZ=Asia/Shanghai "$IMAGE" >/dev/null || fail "容器启动失败"
  ok=0
  for _ in $(seq 1 60); do
    if [ "$(curl -s -m 2 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${VERIFY_PORT}/ping" 2>/dev/null)" = "200" ]; then
      ok=1; break
    fi
    sleep 0.5
  done
  if [ "$ok" -ne 1 ]; then
    echo "----- container logs -----" >&2
    docker logs "$cname" 2>&1 | tail -30 >&2
    docker rm -f -v "$cname" >/dev/null 2>&1
    fail "容器未在预期时间内就绪"
  fi
  info "容器 /ping -> $(curl -s -m 5 "http://127.0.0.1:${VERIFY_PORT}/ping")"
  docker rm -f -v "$cname" >/dev/null 2>&1
  info "容器启动自检通过 (测试容器已清理)"
fi

echo
printf '\033[32m✔ Docker 镜像构建成功\033[0m\n'
printf '  镜像 : %s\n' "$IMAGE"
printf '  入口 : /opt/openlist/openlist server --no-prefix\n'
printf '  端口 : 5244 (容器内, EXPOSE 5244 5245)\n'
printf '  数据 : /opt/openlist/data (VOLUME)\n'
printf '\n运行示例:\n'
printf '  docker run -d --name openlist -p 5244:5244 -v /etc/openlist:/opt/openlist/data %s\n' "$IMAGE"
exit 0
