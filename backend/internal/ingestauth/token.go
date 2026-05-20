package ingestauth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"strings"
)

const bearerPrefix = "Bearer "

func NewToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func VerifyAuthorizationHeader(headerValue string, tokenHash string) bool {
	if tokenHash == "" || !strings.HasPrefix(headerValue, bearerPrefix) {
		return false
	}
	token := strings.TrimSpace(strings.TrimPrefix(headerValue, bearerPrefix))
	if token == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(HashToken(token)), []byte(tokenHash)) == 1
}
