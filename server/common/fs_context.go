package common

import (
	"github.com/OpenListTeam/OpenList/v4/internal/conf"
	"github.com/OpenListTeam/OpenList/v4/internal/errs"
	"github.com/OpenListTeam/OpenList/v4/internal/model"
	"github.com/OpenListTeam/OpenList/v4/internal/op"
	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
	"strings"
)

// FsContext 封装 FS 处理器的公共上下文：用户、路径、元数据
type FsContext struct {
	User *model.User
	Path string
	Meta *model.Meta
}

// ResolveFsContext 从 gin.Context 解析 FS 上下文：
// 1. 取用户 2. 拼路径 3. 查元数据 4. 存储 meta 到 context
// 失败时自动返回错误响应，调用者只需检查返回的 error
func ResolveFsContext(c *gin.Context, reqPath string) (*FsContext, error) {
	user := GetUser(c)
	path, err := user.JoinPath(reqPath)
	if err != nil {
		return nil, err
	}
	meta, err := op.GetNearestMeta(path)
	if err != nil && !errors.Is(errors.Cause(err), errs.MetaNotFound) {
		return nil, err
	}
	GinAppendValues(c, conf.MetaKey, meta)
	return &FsContext{User: user, Path: path, Meta: meta}, nil
}

// ResolveFsContextWithAccess 在 ResolveFsContext 基础上检查访问权限（密码 + 读权限）
func ResolveFsContextWithAccess(c *gin.Context, reqPath, password string) (*FsContext, error) {
	fc, err := ResolveFsContext(c, reqPath)
	if err != nil {
		return nil, err
	}
	if !CanAccess(fc.User, fc.Meta, fc.Path, password) {
		return nil, errs.PermissionDenied
	}
	return fc, nil
}

// ResolveFsContextHandler 是一个 gin.HandlerFunc 包装器，将 ResolveFsContext 的结果存入 gin.Keys
// 适用于需要中间件模式的场景
func ResolveFsContextHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 此中间件不绑定特定路径，仅确保用户已认证
		// 具体路径解析由各处理器自行完成
		c.Next()
	}
}

// CanWriteAtPath 检查用户是否对指定路径有写权限（合并了 CanWrite + CanWriteContent 检查）
func CanWriteAtPath(user *model.User, meta *model.Meta, path string) bool {
	return CanWrite(user, meta, path) && (user.CanWriteContent() || CanWriteContentBypassUserPerms(meta, path))
}

// CanWriteToParent 检查用户是否对父目录有写权限
func CanWriteToParent(user *model.User, path string) (bool, *model.Meta, error) {
	parentPath := parentDir(path)
	meta, err := op.GetNearestMeta(parentPath)
	if err != nil && !errors.Is(errors.Cause(err), errs.MetaNotFound) {
		return false, nil, err
	}
	return CanWrite(user, meta, parentPath) && (user.CanWriteContent() || CanWriteContentBypassUserPerms(meta, parentPath)), meta, nil
}

// parentDir 返回父目录路径
func parentDir(path string) string {
	if len(path) == 0 {
		return "/"
	}
	// 去掉末尾的 /
	if path[len(path)-1] == '/' {
		path = path[:len(path)-1]
	}
	// 特殊处理共享根路径：/@s/<sid> 视为根，父目录仍为自身
	if strings.HasPrefix(path, "/@s/") {
		// 去掉前缀后剩余部分
		rest := strings.TrimPrefix(path, "/@s/")
		// 如果剩余部分不包含 '/'，说明是共享根路径（只有 sid）
		if !strings.Contains(rest, "/") {
			// 返回原路径（保持不带尾部斜杠）
			return path
		}
	}
	for i := len(path) - 1; i >= 0; i-- {
		if path[i] == '/' {
			return path[:i+1]
		}
	}
	return "/"
}
