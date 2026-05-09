package comment

import (
	"errors"
	"strings"
	"unicode/utf8"
)

var allowedColors = map[string]struct{}{
	"#ffffff": {},
	"#ff5252": {},
	"#ffd740": {},
	"#69f0ae": {},
	"#40c4ff": {},
	"#e040fb": {},
}

func ValidateCreateRequest(req CreateRequest) (CreateRequest, error) {
	req.Body = strings.TrimSpace(req.Body)
	if req.Body == "" {
		return CreateRequest{}, errors.New("body is required")
	}
	if utf8.RuneCountInString(req.Body) > 100 {
		return CreateRequest{}, errors.New("body must be 100 characters or less")
	}

	if !validDirection(req.Direction) {
		return CreateRequest{}, errors.New("invalid direction")
	}
	if _, ok := allowedColors[req.Color]; !ok {
		return CreateRequest{}, errors.New("invalid color")
	}
	if req.FontSize == "" {
		req.FontSize = FontSizeMedium
	}
	if req.FontSize != FontSizeSmall && req.FontSize != FontSizeMedium && req.FontSize != FontSizeLarge {
		return CreateRequest{}, errors.New("invalid font size")
	}

	return req, nil
}

func validDirection(direction Direction) bool {
	switch direction {
	case DirectionRightToLeft, DirectionLeftToRight, DirectionTopToBottom, DirectionBottomToTop, DirectionFixedTop, DirectionFixedBottom:
		return true
	default:
		return false
	}
}
