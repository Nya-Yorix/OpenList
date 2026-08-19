package common

type Resp[T any] struct {
	Code      int    `json:"code"`
	Message   string `json:"message"`
	ErrorCode string `json:"error_code,omitempty"` // 错误码，用于前端国际化
	Data      T      `json:"data"`
}

type PageResp struct {
	Content interface{} `json:"content"`
	Total   int64       `json:"total"`
}
