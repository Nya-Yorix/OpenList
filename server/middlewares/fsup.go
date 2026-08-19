package middlewares

import (
	"net/url"
	stdpath "path"

	"github.com/OpenListTeam/OpenList/v4/internal/errs"
	"github.com/OpenListTeam/OpenList/v4/internal/op"
	"github.com/OpenListTeam/OpenList/v4/server/common"
	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
)

func FsUp(c *gin.Context) {
	path := c.GetHeader("File-Path")
	path, err := url.PathUnescape(path)
	if err != nil {
		common.ErrorResp(c, err, 400)
		c.Abort()
		return
	}
	user := common.GetUser(c)
	path, err = user.JoinPath(path)
	if err != nil {
		common.ErrorResp(c, err, 403)
		return
	}
	parentPath := stdpath.Dir(path)
	parentMeta, err := op.GetNearestMeta(parentPath)
	if err != nil && !errors.Is(errors.Cause(err), errs.MetaNotFound) {
		common.ErrorResp(c, err, 500, true)
		c.Abort()
		return
	}
	if !common.CanWriteAtPath(user, parentMeta, parentPath) {
		common.ErrorResp(c, errs.PermissionDenied, 403)
		c.Abort()
		return
	}
	c.Next()
}
