package ingestauth

import "testing"

func TestVerifyAuthorizationHeaderRequiresBearerToken(t *testing.T) {
	token := "stream-token"
	tokenHash := HashToken(token)

	if !VerifyAuthorizationHeader("Bearer "+token, tokenHash) {
		t.Fatal("valid bearer token was rejected")
	}
	if VerifyAuthorizationHeader(token, tokenHash) {
		t.Fatal("token without bearer scheme was accepted")
	}
	if VerifyAuthorizationHeader("Bearer other-token", tokenHash) {
		t.Fatal("wrong bearer token was accepted")
	}
}
