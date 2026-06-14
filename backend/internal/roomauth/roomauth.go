package roomauth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"strings"
)

func NewBypassToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func HashBypassToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func VerifyBypassToken(token, hash string) bool {
	if hash == "" || token == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(HashBypassToken(token)), []byte(hash)) == 1
}

func HashPassword(password string) (string, error) {
	saltBytes := make([]byte, 16)
	if _, err := rand.Read(saltBytes); err != nil {
		return "", err
	}
	salt := hex.EncodeToString(saltBytes)
	hash := hashWithSalt(password, salt)
	return salt + "$" + hash, nil
}

func VerifyPassword(password, saltAndHash string) bool {
	if saltAndHash == "" {
		return false
	}
	parts := strings.SplitN(saltAndHash, "$", 2)
	if len(parts) != 2 {
		return false
	}
	salt, storedHash := parts[0], parts[1]
	computed := hashWithSalt(password, salt)
	return subtle.ConstantTimeCompare([]byte(computed), []byte(storedHash)) == 1
}

func hashWithSalt(password, salt string) string {
	sum := sha256.Sum256([]byte(salt + ":" + password))
	return hex.EncodeToString(sum[:])
}
