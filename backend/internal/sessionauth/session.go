package sessionauth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"strings"
)

const CookieName = "boke_session"

func Sign(subject string, secret []byte) string {
	sig := sign(subject, secret)
	return subject + "." + base64.RawURLEncoding.EncodeToString(sig)
}

func Verify(cookieValue string, secret []byte) (string, error) {
	dot := strings.LastIndex(cookieValue, ".")
	if dot < 0 {
		return "", errors.New("invalid cookie format")
	}
	subject := cookieValue[:dot]
	sigB64 := cookieValue[dot+1:]

	got, err := base64.RawURLEncoding.DecodeString(sigB64)
	if err != nil {
		return "", errors.New("invalid cookie signature encoding")
	}
	want := sign(subject, secret)
	if !hmac.Equal(got, want) {
		return "", errors.New("invalid cookie signature")
	}
	return subject, nil
}

func sign(subject string, secret []byte) []byte {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(subject))
	return mac.Sum(nil)
}
