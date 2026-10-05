#!/usr/bin/env bash
#
# copy-least.sh — 把项目源码复制到一份"最小"目录树，自动跳过构建产物与构建缓存。
#
# 用法:
#   ./copy-least.sh [选项]
#
# 选项:
#   -s, --src DIR        源目录 (默认: 脚本所在目录)
#   -d, --dst DIR        目标目录 (默认: /apps/openlist_least)
#   -x, --exclude PAT    追加一条 tar 排除规则 (可重复)
#   -e, --exclude-from F 从文件追加排除规则 (每行一条, 可重复)
#   -n, --dry-run        只列出将要复制的内容, 不写入
#   -v, --verbose        打印完整文件清单
#       --clean          复制前清空目标目录 (危险, 默认关闭)
#       --keep-public-dist
#                        保留 public/dist (前端嵌入到 Go 二进制的构建产物)
#   -h, --help           显示帮助
#
# 说明: 目标目录若位于源目录内部会直接报错退出, 避免无限递归。
#
set -euo pipefail

# ---------- 默认值 ----------
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DST="/apps/openlist_least"
DRY_RUN=0
VERBOSE=0
CLEAN=0
KEEP_PUBLIC_DIST=0
EXTRA_EXCLUDES=()
EXTRA_EXCLUDE_FILES=()

# ---------- 参数解析 ----------
usage() {
    sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 0
}

die() { printf 'copy-least: 错误: %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        -s|--src)         [[ $# -ge 2 ]] || die "$1 需要参数"; SRC="$2"; shift 2 ;;
        -d|--dst)         [[ $# -ge 2 ]] || die "$1 需要参数"; DST="$2"; shift 2 ;;
        -x|--exclude)     [[ $# -ge 2 ]] || die "$1 需要参数"; EXTRA_EXCLUDES+=("$2"); shift 2 ;;
        -e|--exclude-from)
                          [[ $# -ge 2 ]] || die "$1 需要参数"
                          [[ -f "$2" ]] || die "排除清单不存在: $2"
                          EXTRA_EXCLUDE_FILES+=("$2"); shift 2 ;;
        -n|--dry-run)     DRY_RUN=1; shift ;;
        -v|--verbose)     VERBOSE=1; shift ;;
        --clean)          CLEAN=1; shift ;;
        --keep-public-dist) KEEP_PUBLIC_DIST=1; shift ;;
        -h|--help)        usage ;;
        *)                die "未知参数: $1 (用 -h 查看帮助)" ;;
    esac
done

# ---------- 基本校验 ----------
[[ -d "$SRC" ]] || die "源目录不存在: $SRC"
SRC="$(cd "$SRC" && pwd)"
command -v tar >/dev/null 2>&1 || die "未找到 tar"

# 目标目录不能是源目录本身或其后代
if [[ "$DST" = "$SRC" ]]; then
    die "目标目录与源目录相同: $DST"
fi
DST_ABS="$DST"
mkdir -p "$(dirname "$DST_ABS")" 2>/dev/null || true
DST_ABS="$(cd "$(dirname "$DST_ABS")" && pwd)/$(basename "$DST_ABS")"
if [[ "$DST_ABS" == "$SRC"/* ]]; then
    die "目标目录位于源目录内部, 会无限递归: $DST_ABS"
fi

# --clean 的安全护栏
if [[ "$CLEAN" == 1 ]]; then
    case "$DST_ABS" in
        /|/apps|/root|/home|"$HOME"|"$SRC") die "--clean 拒绝清空危险路径: $DST_ABS" ;;
    esac
    # 路径层级过浅同样拒绝
    if [[ "$(printf '%s' "$DST_ABS" | tr -cd '/' | wc -c)" -lt 2 ]]; then
        die "--clean 拒绝清空层级过浅的路径: $DST_ABS"
    fi
fi

# ---------- 排除清单 ----------
EXCL_FILE="$(mktemp "${TMPDIR:-/tmp}/copy-least-excl.XXXXXX")"
trap 'rm -f "$EXCL_FILE"' EXIT

{
    # --- 构建产物 ---
    echo './dist'                     # 发布压缩包
    echo './bin'                      # 编译出的二进制 + pid
    echo './output'
    echo './build'
    echo './tmp'                      # air 热重载临时构建目录
    echo './docker-context'           # build-image.sh 生成的 docker 上下文
    echo './A-OpenList-Frontend/dist' # 前端构建产物
    echo './A-OpenList-Frontend/.turbo'

    # public/dist 默认排除: 它是前端构建产物, 只在 go:embed 编译时才需要
    [[ "$KEEP_PUBLIC_DIST" == 1 ]] || echo './public/dist'

    # --- 依赖与构建缓存 ---
    echo './A-OpenList-Frontend/node_modules'
    echo './A-OpenList-Frontend/.cache'
    echo './A-OpenList-Frontend/.vite'
    echo './A-OpenList-Frontend/.eslintcache'

    # --- 运行期状态 ---
    echo './data'

    # --- 工具/编辑器/系统垃圾 ---
    echo './.zcode'
    echo './.idea'
    echo './.vscode'
    echo './.test'
    echo './.codebuddy'

    # --- 通用规则 (按文件/目录名匹配, 不限层级) ---
    echo '.git'
    echo '.gitignore.bak'
    echo '.DS_Store'
    echo 'node_modules'
    echo '.cache'
    echo '.vite'
    echo '.turbo'
    echo '.parcel-cache'
    echo '.pnpm-store'
    echo '.eslintcache'
    echo '__pycache__'
    echo '.VSCodeCounter'
    echo '*.log'          # run.log / build-errors.log
    echo '*.pid'
    echo '*.db'           # data.db
    echo '*.db-journal'
    echo '*.db-wal'
    echo '*.db-shm'
    echo '*.tsbuildinfo'
    echo '*.pyc'
    echo '*.exe'
    echo '*.exe~'
    echo '*.dll'
    echo '*.so'
    echo '*.dylib'
    echo '*.test'
    echo '*.out'
    echo '*.syso'
    echo '*.tar.gz'
    echo '*.zip'
    echo '*.tmp'
    echo '*~'
} > "$EXCL_FILE"

for f in "${EXTRA_EXCLUDE_FILES[@]:-}"; do
    [[ -n "$f" ]] && cat "$f" >> "$EXCL_FILE"
done
for p in "${EXTRA_EXCLUDES[@]:-}"; do
    [[ -n "$p" ]] && printf '%s\n' "$p" >> "$EXCL_FILE"
done

# 组装 tar 排除参数
TAR_EXCL=()
while IFS= read -r line; do
    [[ -z "$line" || "$line" == \#* ]] && continue
    TAR_EXCL+=(--exclude="$line")
done < "$EXCL_FILE"

# ---------- 复制 ----------
# 统一以相对成员名打包, 保证排除规则可预测。
TAR_OPTS=(--warning=no-file-changed --warning=no-file-ignored)

if [[ "$DRY_RUN" == 1 ]]; then
    LIST_FILE="$(mktemp "${TMPDIR:-/tmp}/copy-least-list.XXXXXX")"
    tar -C "$SRC" -cf - "${TAR_OPTS[@]}" "${TAR_EXCL[@]}" . \
        | tar -C "$SRC" -tf - > "$LIST_FILE" || true

    COUNT=$(wc -l < "$LIST_FILE")
    SIZE=$(tar -C "$SRC" -cf - "${TAR_OPTS[@]}" "${TAR_EXCL[@]}" . 2>/dev/null | wc -c)

    echo "源目录:   $SRC"
    echo "目标目录: $DST_ABS"
    echo "模式:     dry-run (未写入任何文件)"
    echo "将复制:   $COUNT 个条目, 约 $(numfmt --to=iec "$SIZE" 2>/dev/null || echo "${SIZE}B")"
    echo "排除清单: $EXCL_FILE (已保留? 否, 退出时删除)"
    if [[ "$VERBOSE" == 1 ]]; then
        echo "--- 清单 ---"
        cat "$LIST_FILE"
    else
        echo "--- 条目预览 (前 20) ---"
        head -20 "$LIST_FILE"
    fi
    rm -f "$LIST_FILE"
    exit 0
fi

if [[ "$CLEAN" == 1 ]]; then
    echo "清空目标目录: $DST_ABS"
    rm -rf "${DST_ABS:?}/"*
    rm -rf "${DST_ABS:?}/".[!.]* 2>/dev/null || true
fi

mkdir -p "$DST_ABS"

START=$(date +%s)
# 源 tar 退出码 1 表示"读取期间文件被改动", 对复制结果无实质影响, 予以容忍。
set +e
tar -C "$SRC" -cf - "${TAR_OPTS[@]}" "${TAR_EXCL[@]}" . | tar -C "$DST_ABS" -xf -
RC=("${PIPESTATUS[@]}")
set -e
if [[ "${RC[0]}" -gt 1 || "${RC[1]}" -ne 0 ]]; then
    die "复制失败 (tar 退出码: 源=${RC[0]} 目标=${RC[1]})"
fi

# tar 打包时父目录的时间戳可能被回写, 统一校正为目标自身的当前时间无意义;
# 这里只统计结果。
FILES=$(find "$DST_ABS" -mindepth 1 | wc -l)
SIZE=$(du -sh "$DST_ABS" 2>/dev/null | cut -f1)
ELAPSED=$(( $(date +%s) - START ))

echo "完成: $SRC  ->  $DST_ABS"
echo "条目: $FILES    体积: ${SIZE:-?}    耗时: ${ELAPSED}s"
echo "已忽略构建产物/缓存 (部分): dist, bin, output, tmp, docker-context, data, public/dist, node_modules, .zcode, *.log, *.db, *.tar.gz"
if [[ "$KEEP_PUBLIC_DIST" == 1 ]]; then
    echo "注意: 本次保留了 public/dist (前端嵌入产物)"
fi
