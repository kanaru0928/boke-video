package comment

import "testing"

func TestValidateCreateRequestAcceptsValidRequest(t *testing.T) {
	req, err := ValidateCreateRequest(CreateRequest{
		Body:      "こんにちは",
		Direction: DirectionRightToLeft,
		Color:     "#ffffff",
		FontSize:  FontSizeMedium,
	})
	if err != nil {
		t.Fatalf("ValidateCreateRequest returned error: %v", err)
	}
	if req.Body != "こんにちは" {
		t.Fatalf("body = %q", req.Body)
	}
}

func TestValidateCreateRequestRejectsInvalidDirection(t *testing.T) {
	_, err := ValidateCreateRequest(CreateRequest{
		Body:      "こんにちは",
		Direction: Direction("bad"),
		Color:     "#ffffff",
		FontSize:  FontSizeMedium,
	})
	if err == nil {
		t.Fatal("ValidateCreateRequest returned nil error")
	}
}

func TestValidateCreateRequestRejectsTooLongBody(t *testing.T) {
	body := make([]rune, 101)
	for i := range body {
		body[i] = 'あ'
	}

	_, err := ValidateCreateRequest(CreateRequest{
		Body:      string(body),
		Direction: DirectionRightToLeft,
		Color:     "#ffffff",
		FontSize:  FontSizeMedium,
	})
	if err == nil {
		t.Fatal("ValidateCreateRequest returned nil error")
	}
}
