package model

type OrderItem struct {
	ID    uint `json:"id"`
	Order int  `json:"order"`
}

type SharingOrderItem struct {
	ID    string `json:"id"`
	Order int    `json:"order"`
}
