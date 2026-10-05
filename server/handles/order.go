package handles

import (
	"github.com/OpenListTeam/OpenList/v4/internal/conf"
	"github.com/OpenListTeam/OpenList/v4/internal/model"
	"github.com/OpenListTeam/OpenList/v4/internal/op"
	"github.com/OpenListTeam/OpenList/v4/server/common"
	"github.com/gin-gonic/gin"
)

type UpdateOrdersReq struct {
	Orders []model.OrderItem `json:"orders" binding:"required"`
}

func UpdateUserOrders(c *gin.Context) {
	updateOrders(c, op.UpdateUserOrders)
}

func UpdateMetaOrders(c *gin.Context) {
	updateOrders(c, op.UpdateMetaOrders)
}

func UpdateStorageOrders(c *gin.Context) {
	updateOrders(c, op.UpdateStorageOrders)
}

func updateOrders(c *gin.Context, update func(orders []model.OrderItem) error) {
	var req UpdateOrdersReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	if err := update(req.Orders); err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	common.SuccessResp(c)
}

type UpdateSharingOrdersReq struct {
	Orders []model.SharingOrderItem `json:"orders" binding:"required"`
}

func UpdateSharingOrders(c *gin.Context) {
	var req UpdateSharingOrdersReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	user := c.Request.Context().Value(conf.UserKey).(*model.User)
	if err := op.UpdateSharingOrders(req.Orders, user.ID, user.IsAdmin()); err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	common.SuccessResp(c)
}
