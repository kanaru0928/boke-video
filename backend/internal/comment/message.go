package comment

import "time"

type Direction string

const (
	DirectionRightToLeft Direction = "rightToLeft"
	DirectionLeftToRight Direction = "leftToRight"
	DirectionTopToBottom Direction = "topToBottom"
	DirectionBottomToTop Direction = "bottomToTop"
	DirectionFixedTop    Direction = "fixedTop"
	DirectionFixedBottom Direction = "fixedBottom"
)

type FontSize string

const (
	FontSizeSmall  FontSize = "small"
	FontSizeMedium FontSize = "medium"
	FontSizeLarge  FontSize = "large"
)

type CreateRequest struct {
	Body      string    `json:"body"`
	Direction Direction `json:"direction"`
	Color     string    `json:"color"`
	FontSize  FontSize  `json:"fontSize"`
}

type Message struct {
	Type      string    `json:"type"`
	RoomID    string    `json:"roomId"`
	CommentID string    `json:"commentId"`
	Author    Author    `json:"author"`
	Body      string    `json:"body"`
	Direction Direction `json:"direction"`
	Color     string    `json:"color"`
	FontSize  FontSize  `json:"fontSize"`
	SentAt    time.Time `json:"sentAt"`
}

type Author struct {
	Subject     string `json:"subject"`
	DisplayName string `json:"displayName"`
}

type StoredComment struct {
	ID                string
	RoomID            string
	AuthorSub         string
	AuthorDisplayName string
	Body              string
	Direction         Direction
	Color             string
	FontSize          FontSize
	SentAt            time.Time
}
