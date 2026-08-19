package middlewares

import (
	"crypto/subtle"

	"github.com/OpenListTeam/OpenList/v4/internal/conf"
	"github.com/OpenListTeam/OpenList/v4/internal/errs"
	"github.com/OpenListTeam/OpenList/v4/internal/op"
	"github.com/OpenListTeam/OpenList/v4/internal/setting"
	"github.com/OpenListTeam/OpenList/v4/server/common"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

// Auth is a middleware that checks if the user is logged in.
// if token is empty, set user to guest
func Auth(allowDisabledGuest bool) func(c *gin.Context) {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if subtle.ConstantTimeCompare([]byte(token), []byte(setting.GetStr(conf.Token))) == 1 {
			admin, err := op.GetAdmin()
			if err != nil {
				common.ErrorResp(c, err, 500)
				c.Abort()
				return
			}
			common.GinAppendValues(c, conf.UserKey, admin)
			log.Debugf("use admin token: %+v", admin)
			c.Next()
			return
		}
if token == "" {
		guest, err := op.GetGuest()
		if err != nil {
			common.ErrorResp(c, err, 500)
			c.Abort()
			return
		}
		if !allowDisabledGuest && guest.Disabled {
			common.ErrorResp(c, errs.GuestDisabled, 401)
			c.Abort()
			return
		}
			common.GinAppendValues(c, conf.UserKey, guest)
			log.Debugf("use empty token: %+v", guest)
			c.Next()
			return
		}
		userClaims, err := common.ParseToken(token)
		if err != nil {
			common.ErrorResp(c, err, 401)
			c.Abort()
			return
		}
		user, err := op.GetUserByName(userClaims.Username)
		if err != nil {
			common.ErrorResp(c, err, 401)
			c.Abort()
			return
		}
// validate password timestamp
	if userClaims.PwdTS != user.PwdTS {
		common.ErrorResp(c, errs.PasswordChanged, 401)
		c.Abort()
		return
	}
	if user.Disabled {
		common.ErrorResp(c, errs.UserDisabled, 401)
		c.Abort()
		return
	}
		common.GinAppendValues(c, conf.UserKey, user)
		log.Debugf("use login token: %+v", user)
		c.Next()
	}
}

func AuthNotGuest(c *gin.Context) {
	user := common.GetUser(c)
	if user.IsGuest() {
		common.ErrorResp(c, errs.GuestForbidden, 403)
		c.Abort()
	} else {
		c.Next()
	}
}

func AuthAdmin(c *gin.Context) {
	user := common.GetUser(c)
	if !user.IsAdmin() {
		common.ErrorResp(c, errs.NotAdmin, 403)
		c.Abort()
	} else {
		c.Next()
	}
}
