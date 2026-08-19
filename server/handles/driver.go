package handles

import (
	"github.com/OpenListTeam/OpenList/v4/internal/errs"
	"github.com/OpenListTeam/OpenList/v4/internal/op"
	"github.com/OpenListTeam/OpenList/v4/server/common"
	"github.com/gin-gonic/gin"
)

func ListDriverInfo(c *gin.Context) {
	common.SuccessResp(c, op.GetDriverInfoMap())
}

func ListDriverNames(c *gin.Context) {
	common.SuccessResp(c, op.GetDriverNames())
}

func GetDriverInfo(c *gin.Context) {
	driverName := c.Query("driver")
	infoMap := op.GetDriverInfoMap()
	items, ok := infoMap[driverName]
	if !ok {
		common.ErrorResp(c, errs.DriverNotFound, 404)
		return
	}
	common.SuccessResp(c, items)
}
