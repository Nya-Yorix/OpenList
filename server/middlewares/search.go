package middlewares

import (
	"github.com/gin-gonic/gin"
)

func SearchIndex(c *gin.Context) {
	// 搜索引擎总是可用，直接放行
	c.Next()
}
