package data

import (
	"strconv"

	"github.com/OpenListTeam/OpenList/v4/cmd/flags"
	"github.com/OpenListTeam/OpenList/v4/internal/conf"
	"github.com/OpenListTeam/OpenList/v4/internal/db"
	"github.com/OpenListTeam/OpenList/v4/internal/model"
	"github.com/OpenListTeam/OpenList/v4/internal/op"
	"github.com/OpenListTeam/OpenList/v4/pkg/utils"
	"github.com/OpenListTeam/OpenList/v4/pkg/utils/random"
	"github.com/pkg/errors"
	"gorm.io/gorm"
)

func initSettings() {
	initialSettingItems := InitialSettings()
	isActive := func(key string) bool {
		for _, item := range initialSettingItems {
			if item.Key == key {
				return true
			}
		}
		return false
	}
	settings, err := op.GetSettingItems()
	if err != nil {
		utils.Log.Fatalf("failed get settings: %+v", err)
	}
	settingMap := map[string]*model.SettingItem{}
	for _, v := range settings {
		if v.Key == "" {
			err := db.DeleteSettingItemByKey(v.Key)
			if err != nil {
				utils.Log.Errorf("failed delete setting with empty key: %+v", err)
			}
			continue
		}
		if !isActive(v.Key) {
			utils.Log.Infof("deleting inactive setting: %s", v.Key)
			err := db.DeleteSettingItemByKey(v.Key)
			if err != nil {
				utils.Log.Errorf("failed delete inactive setting %s: %+v", v.Key, err)
			}
			continue
		}
		settingMap[v.Key] = &v
	}
	op.MigrationSettingItems = map[string]op.MigrationValueItem{}
	// create or save setting
	var saveItems []model.SettingItem
	for i := range initialSettingItems {
		item := &initialSettingItems[i]
		item.Index = uint(i)
		migrationValue := item.MigrationValue
		if len(migrationValue) > 0 {
			op.MigrationSettingItems[item.Key] = op.MigrationValueItem{MigrationValue: item.MigrationValue, Value: item.Value}
			item.MigrationValue = ""
		}
		// err
		stored, ok := settingMap[item.Key]
		if !ok {
			stored, err = op.GetSettingItemByKey(item.Key)
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				utils.Log.Fatalf("failed get setting: %+v", err)
				continue
			}
		}
		if item.Key != conf.VERSION && stored != nil &&
			(len(migrationValue) == 0 || stored.Value != migrationValue) {
			item.Value = stored.Value
		}
		_, err = op.HandleSettingItemHook(item)
		if err != nil {
			utils.Log.Errorf("failed to execute hook on %s: %+v", item.Key, err)
			continue
		}
		if stored == nil || *item != *stored {
			saveItems = append(saveItems, *item)
		}
	}
	if len(saveItems) > 0 {
		err = db.SaveSettingItems(saveItems)
		if err != nil {
			utils.Log.Fatalf("failed save setting: %+v", err)
		} else {
			op.SettingCacheUpdate()
		}
	}
}

func InitialSettings() []model.SettingItem {
	var token string
	if flags.Dev {
		token = "dev_token"
	} else {
		token = random.Token()
	}
	siteVersion := conf.Version
	initialSettingItems := []model.SettingItem{
		// site settings
		{Key: conf.VERSION, Value: siteVersion, Type: conf.TypeString, Group: model.SITE, Flag: model.READONLY},
		//{Key: conf.ApiUrl, Value: "", Type: conf.TypeString, Group: model.SITE},
		//{Key: conf.BasePath, Value: "", Type: conf.TypeString, Group: model.SITE},
		{Key: conf.SiteTitle, Value: "OpenList", Type: conf.TypeString, Group: model.SITE},
		{Key: conf.Announcement, Value: "欢迎来到 OpenList 项目！\n\n本项目由 [Yorix](https://github.com/Nya-Yorix) 使用 Mimo V2.5 Pro 模型精简\n请支持[原项目](https://github.com/OpenListTeam/OpenList)", Type: conf.TypeText, Group: model.SITE},
		{Key: "pagination_type", Value: "all", Type: conf.TypeSelect, Options: "all,pagination,load_more,auto_load_more", Group: model.SITE},
		{Key: "default_page_size", Value: "30", Type: conf.TypeNumber, Group: model.SITE},
		{Key: conf.AllowIndexed, Value: "true", Type: conf.TypeBool, Group: model.SITE},
		{Key: conf.AllowMounted, Value: "true", Type: conf.TypeBool, Group: model.SITE},
		{Key: conf.RobotsTxt, Value: "User-agent: *\nAllow: /", Type: conf.TypeText, Group: model.SITE},
		// style settings
		{Key: conf.Logo, Value: "https://res.oplist.org/logo/logo.svg", MigrationValue: "https://cdn.oplist.org/gh/OpenListTeam/Logo@main/logo.svg", Type: conf.TypeText, Group: model.STYLE},
		{Key: conf.Favicon, Value: "https://res.oplist.org/logo/logo.svg", MigrationValue: "https://cdn.oplist.org/gh/OpenListTeam/Logo@main/logo.svg", Type: conf.TypeString, Group: model.STYLE},
		{Key: conf.MainColor, Value: "#1890ff", Type: conf.TypeString, Group: model.STYLE},
		{Key: "home_icon", Value: "", Type: conf.TypeString, Group: model.STYLE},
		{Key: "share_icon", Value: "", Type: conf.TypeString, Group: model.STYLE},
		{Key: "home_container", Value: "max_980px", Type: conf.TypeSelect, Options: "max_980px,hope_container", Group: model.STYLE},
		{Key: "settings_layout", Value: "list", Type: conf.TypeSelect, Options: "list,responsive", Group: model.STYLE},
		{Key: conf.HideStorageDetails, Value: "false", Type: conf.TypeBool, Group: model.STYLE, Flag: model.PRIVATE},
		{Key: conf.HideStorageDetailsInManagePage, Value: "false", Type: conf.TypeBool, Group: model.STYLE, Flag: model.PRIVATE},
		{Key: "show_disk_usage_in_plain_text", Value: "false", Type: conf.TypeBool, Group: model.STYLE, Flag: model.PUBLIC},
		// preview settings
		{Key: conf.TextTypes, Value: "txt,htm,html,xml,java,properties,sql,js,md,json,conf,ini,vue,php,py,bat,gitignore,yml,go,sh,c,cpp,h,hpp,tsx,vtt,srt,ass,rs,lrc,strm", Type: conf.TypeText, Group: model.PREVIEW, Flag: model.PRIVATE},
		{Key: conf.AudioTypes, Value: "mp3,flac,ogg,m4a,wav,opus,wma", Type: conf.TypeText, Group: model.PREVIEW, Flag: model.PRIVATE},
		{Key: conf.VideoTypes, Value: "mp4,mkv,avi,mov,rmvb,webm,flv,m3u8", Type: conf.TypeText, Group: model.PREVIEW, Flag: model.PRIVATE},
		{Key: conf.ImageTypes, Value: "jpg,tiff,jpeg,png,gif,bmp,svg,ico,swf,webp,avif", Type: conf.TypeText, Group: model.PREVIEW, Flag: model.PRIVATE},
		//{Key: conf.OfficeTypes, Value: "doc,docx,xls,xlsx,ppt,pptx", Type: conf.TypeText, Group: model.PREVIEW, Flag: model.PRIVATE},
		{Key: conf.ProxyTypes, Value: "m3u8,url", Type: conf.TypeText, Group: model.PREVIEW, Flag: model.PRIVATE},
		{Key: conf.ProxyIgnoreHeaders, Value: "authorization,referer", Type: conf.TypeText, Group: model.PREVIEW, Flag: model.PRIVATE},
		
		{Key: conf.AudioAutoplay, Value: "true", Type: conf.TypeBool, Group: model.PREVIEW},
		{Key: conf.VideoAutoplay, Value: "true", Type: conf.TypeBool, Group: model.PREVIEW},
		{Key: conf.PreviewDownloadByDefault, Value: "false", Type: conf.TypeBool, Group: model.PREVIEW},
		{Key: conf.PreviewArchivesByDefault, Value: "true", Type: conf.TypeBool, Group: model.PREVIEW},
		{Key: conf.SharePreviewDownloadByDefault, Value: "true", Type: conf.TypeBool, Group: model.PREVIEW},
		{Key: conf.SharePreviewArchivesByDefault, Value: "false", Type: conf.TypeBool, Group: model.PREVIEW},
		{Key: conf.ReadMeAutoRender, Value: "true", Type: conf.TypeBool, Group: model.PREVIEW},
		{Key: conf.FilterReadMeScripts, Value: "true", Type: conf.TypeBool, Group: model.PREVIEW}, // frontend
		{Key: conf.NonEFSZipEncoding, Value: "IBM437", Type: conf.TypeString, Group: model.PREVIEW},
		// global settings
		{Key: conf.HideFiles, Value: "/\\/README.md/i", Type: conf.TypeText, Group: model.GLOBAL},
		{Key: "package_download", Value: "true", Type: conf.TypeBool, Group: model.GLOBAL},
		{Key: conf.CustomizeHead, MigrationValue: `<script src="https://cdnjs.cloudflare.com/polyfill/v3/polyfill.min.js?features=String.prototype.replaceAll"></script>`, Type: conf.TypeText, Group: model.GLOBAL, Flag: model.PRIVATE},
		{Key: conf.CustomizeBody, Type: conf.TypeText, Group: model.GLOBAL, Flag: model.PRIVATE},
		{Key: conf.LinkExpiration, Value: "0", Type: conf.TypeNumber, Group: model.GLOBAL, Flag: model.PRIVATE},
		{Key: conf.SignAll, Value: "true", Type: conf.TypeBool, Group: model.GLOBAL, Flag: model.PRIVATE},
		{
			Key: conf.PrivacyRegs, Value: `(?:(?:\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.){3}(?:\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])
([[:xdigit:]]{1,4}(?::[[:xdigit:]]{1,4}){7}|::|:(?::[[:xdigit:]]{1,4}){1,6}|[[:xdigit:]]{1,4}:(?::[[:xdigit:]]{1,4}){1,5}|(?:[[:xdigit:]]{1,4}:){2}(?::[[:xdigit:]]{1,4}){1,4}|(?:[[:xdigit:]]{1,4}:){3}(?::[[:xdigit:]]{1,4}){1,3}|(?:[[:xdigit:]]{1,4}:){4}(?::[[:xdigit:]]{1,4}){1,2}|(?:[[:xdigit:]]{1,4}:){5}:[[:xdigit:]]{1,4}|(?:[[:xdigit:]]{1,4}:){1,6}:)
(?U)access_token=(.*)&`,
			Type: conf.TypeText, Group: model.GLOBAL, Flag: model.PRIVATE,
		},
		{Key: conf.OcrApi, Value: "https://api.nn.ci/ocr/file/json", Type: conf.TypeString, Group: model.GLOBAL},
		{Key: conf.FilenameCharMapping, Value: `{"/": "|"}`, Type: conf.TypeText, Group: model.GLOBAL},
		{Key: conf.ForwardDirectLinkParams, Value: "false", Type: conf.TypeBool, Group: model.GLOBAL},
		{Key: conf.IgnoreDirectLinkParams, Value: "sign,openlist_ts,raw", Type: conf.TypeString, Group: model.GLOBAL},
		{Key: conf.SharePreview, Value: "false", Type: conf.TypeBool, Group: model.GLOBAL, Flag: model.PUBLIC},
		{Key: conf.ShareArchivePreview, Value: "false", Type: conf.TypeBool, Group: model.GLOBAL, Flag: model.PUBLIC},
		{Key: conf.ShareForceProxy, Value: "true", Type: conf.TypeBool, Group: model.GLOBAL, Flag: model.PRIVATE},
		{Key: conf.ShareSummaryContent, Value: "@{{creator}} 分享了 {{#each files}}{{#if @first}}\"{{filename this}}\"{{/if}}{{#if @last}}{{#unless (eq @index 0)}} 等 {{@index}} 个文件{{/unless}}{{/if}}{{/each}}，来自 {{site_title}}：{{base_url}}/@s/{{id}}{{#if pwd}} ，提取码：{{pwd}}{{/if}}{{#if expires}} ，请在 {{dateLocaleString expires}} 前访问。{{/if}}", Type: conf.TypeText, Group: model.GLOBAL, Flag: model.PUBLIC},
		{Key: conf.HandleHookAfterWriting, Value: "false", Type: conf.TypeBool, Group: model.GLOBAL, Flag: model.PRIVATE},
		{Key: conf.HandleHookRateLimit, Value: "0", Type: conf.TypeNumber, Group: model.GLOBAL, Flag: model.PRIVATE},
		{Key: conf.IgnoreSystemFiles, Value: "false", Type: conf.TypeBool, Group: model.GLOBAL, Flag: model.PRIVATE, Help: `When enabled, ignores common system files during upload (.DS_Store, desktop.ini, Thumbs.db, and files starting with ._)`},

		// single settings
		{Key: conf.Token, Value: token, Type: conf.TypeString, Group: model.SINGLE, Flag: model.PRIVATE},
		{Key: conf.AutoUpdateIndex, Value: "false", Type: conf.TypeBool, Group: model.INDEX},
		{Key: conf.IgnorePaths, Value: "", Type: conf.TypeText, Group: model.INDEX, Flag: model.PRIVATE, Help: `one path per line`},
		{Key: conf.MaxIndexDepth, Value: "20", Type: conf.TypeNumber, Group: model.INDEX, Flag: model.PRIVATE, Help: `max depth of index`},
		{Key: conf.IndexProgress, Value: "{}", Type: conf.TypeText, Group: model.SINGLE, Flag: model.PRIVATE},

		// traffic settings
		{Key: conf.TaskUploadThreadsNum, Value: strconv.Itoa(conf.Conf.Tasks.Upload.Workers), Type: conf.TypeNumber, Group: model.TRAFFIC, Flag: model.PRIVATE},
		{Key: conf.TaskCopyThreadsNum, Value: strconv.Itoa(conf.Conf.Tasks.Copy.Workers), Type: conf.TypeNumber, Group: model.TRAFFIC, Flag: model.PRIVATE},
		{Key: conf.TaskMoveThreadsNum, Value: strconv.Itoa(conf.Conf.Tasks.Move.Workers), Type: conf.TypeNumber, Group: model.TRAFFIC, Flag: model.PRIVATE},
		{Key: conf.TaskDecompressDownloadThreadsNum, Value: strconv.Itoa(conf.Conf.Tasks.Decompress.Workers), Type: conf.TypeNumber, Group: model.TRAFFIC, Flag: model.PRIVATE},
		{Key: conf.TaskDecompressUploadThreadsNum, Value: strconv.Itoa(conf.Conf.Tasks.DecompressUpload.Workers), Type: conf.TypeNumber, Group: model.TRAFFIC, Flag: model.PRIVATE},
		{Key: conf.StreamMaxClientDownloadSpeed, Value: "-1", Type: conf.TypeNumber, Group: model.TRAFFIC, Flag: model.PRIVATE},
		{Key: conf.StreamMaxClientUploadSpeed, Value: "-1", Type: conf.TypeNumber, Group: model.TRAFFIC, Flag: model.PRIVATE},
		{Key: conf.StreamMaxServerDownloadSpeed, Value: "-1", Type: conf.TypeNumber, Group: model.TRAFFIC, Flag: model.PRIVATE},
		{Key: conf.StreamMaxServerUploadSpeed, Value: "-1", Type: conf.TypeNumber, Group: model.TRAFFIC, Flag: model.PRIVATE},
		{Key: conf.MultipartEnabled, Value: "true", Type: conf.TypeBool, Group: model.TRAFFIC, Flag: model.PUBLIC},
		{Key: conf.MultipartChunkSize, Value: "10", Type: conf.TypeNumber, Group: model.TRAFFIC, Flag: model.PUBLIC, Help: `chunk size of multipart upload in MB (positive integer), keep it under your CDN's request body limit; each active session buffers up to 8 chunks on the server's disk`},
	}
	return initialSettingItems
}
