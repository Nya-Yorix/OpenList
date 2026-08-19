package common

import (
	"path"
	"slices"
	"strings"

	"github.com/OpenListTeam/OpenList/v4/internal/conf"
	"github.com/OpenListTeam/OpenList/v4/internal/driver"
	"github.com/OpenListTeam/OpenList/v4/internal/model"
	"github.com/OpenListTeam/OpenList/v4/internal/op"
	"github.com/OpenListTeam/OpenList/v4/pkg/utils"
	"github.com/dlclark/regexp2"
)

func IsStorageSignEnabled(rawPath string) bool {
	storage := op.GetBalancedStorage(rawPath)
	return storage != nil && storage.GetStorage().EnableSign
}

func CanRead(user *model.User, meta *model.Meta, path string) bool {
	// nil user is treated as internal/system context and bypasses per-user read restrictions
	if user == nil {
		return true
	}
	if meta != nil && len(meta.ReadUsers) > 0 && !slices.Contains(meta.ReadUsers, user.ID) && MetaCoversPath(meta.Path, path, meta.ReadUsersSub) {
		return false
	}
	return true
}

func CanWrite(user *model.User, meta *model.Meta, path string) bool {
	// nil user is treated as internal/system context and bypasses per-user write restrictions
	if user == nil {
		return true
	}
	if meta != nil && len(meta.WriteUsers) > 0 && !slices.Contains(meta.WriteUsers, user.ID) && MetaCoversPath(meta.Path, path, meta.WriteUsersSub) {
		return false
	}
	return true
}

func CanWriteContentBypassUserPerms(meta *model.Meta, path string) bool {
	if meta == nil || !meta.Write {
		return false
	}
	return MetaCoversPath(meta.Path, path, meta.WSub)
}

func CanAccess(user *model.User, meta *model.Meta, reqPath string, password string) bool {
	// if the reqPath is in hide (only can check the nearest meta) and user can't see hides, can't access
	if meta != nil && !user.CanSeeHides() && meta.Hide != "" &&
		MetaCoversPath(meta.Path, path.Dir(reqPath), meta.HSub) { // the meta should apply to the parent of current path
		for hide := range strings.SplitSeq(meta.Hide, "\n") {
			re := regexp2.MustCompile(hide, regexp2.None)
			if isMatch, _ := re.MatchString(path.Base(reqPath)); isMatch {
				return false
			}
		}
	}
	if !CanRead(user, meta, reqPath) {
		return false
	}
	// if is not guest and can access without password
	if user.CanAccessWithoutPassword() {
		return true
	}
	// if meta is nil or password is empty, can access
	if meta == nil || meta.Password == "" {
		return true
	}
	// if meta doesn't apply to sub_folder, can access
	if !MetaCoversPath(meta.Path, reqPath, meta.PSub) {
		return true
	}
	// validate password
	return meta.Password == password
}

func MetaCoversPath(metaPath, reqPath string, applyToSubFolder bool) bool {
	if utils.PathEqual(metaPath, reqPath) {
		return true
	}
	return utils.IsSubPath(metaPath, reqPath) && applyToSubFolder
}

// ShouldProxy 统一判断是否应该代理：
// 1. config.MustProxy()
// 2. storage.WebProxy
// 3. storage.WebdavProxyURL()
// 4. proxy_types
// 5. text_types
func ShouldProxy(storage driver.Driver, filename string) bool {
	if storage.Config().MustProxy() || storage.GetStorage().WebProxy || storage.GetStorage().WebdavProxyURL() {
		return true
	}
	ext := utils.Ext(filename)
	if utils.SliceContains(conf.SlicesMap[conf.ProxyTypes], ext) {
		return true
	}
	if utils.SliceContains(conf.SlicesMap[conf.TextTypes], ext) {
		return true
	}
	return false
}
