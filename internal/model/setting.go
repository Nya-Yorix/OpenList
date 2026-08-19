package model

const (
	SINGLE = iota
	SITE
	STYLE
	PREVIEW
	GLOBAL
	INDEX
	TRAFFIC
)

const (
	PUBLIC = iota
	PRIVATE
	READONLY
)

type SettingItem struct {
	Key            string `json:"key" gorm:"primaryKey" binding:"required"` // unique key
	Value          string `json:"value"`                                    // value
	MigrationValue string `json:"-" gorm:"-:all"`                           // deprecated value
	Help           string `json:"help"`                                     // help message
	Type           string `json:"type"`                                     // string, number, bool, select
	Options        string `json:"options"`                                  // values for select
	Group          int    `json:"group"`                                    // use to group setting in frontend
	Flag           int    `json:"flag"`                                     // 0 = public, 1 = private, 2 = readonly
	Index          uint   `json:"index"`
}


