package streamaccess

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"net/url"
	"testing"
	"time"
)

func TestSignerBuildsOvenMediaEngineSignedPlaybackURL(t *testing.T) {
	signer, err := NewSigner(Config{
		BaseURL: "https://rtc.example.com",
		Secret:  "secret",
		TTL:     time.Minute,
		Now: func() time.Time {
			return time.Unix(1000, 0).UTC()
		},
	})
	if err != nil {
		t.Fatalf("NewSigner returned error: %v", err)
	}

	signedURL, err := signer.SignedPlaybackURL("main")
	if err != nil {
		t.Fatalf("SignedPlaybackURL returned error: %v", err)
	}

	parsedURL, err := url.Parse(signedURL)
	if err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}
	if parsedURL.String() != signedURL {
		t.Fatalf("signed URL is not normalized: %q", signedURL)
	}
	if parsedURL.Host != "rtc.example.com:443" {
		t.Fatalf("host = %q", parsedURL.Host)
	}
	if parsedURL.Scheme != "wss" {
		t.Fatalf("scheme = %q", parsedURL.Scheme)
	}
	if parsedURL.Path != "/live/main/master" {
		t.Fatalf("path = %q", parsedURL.Path)
	}

	query := parsedURL.Query()
	policyValue := query.Get("policy")
	if policyValue == "" {
		t.Fatal("policy is empty")
	}
	signature := query.Get("signature")
	if signature == "" {
		t.Fatal("signature is empty")
	}

	rawPolicy, err := base64.RawURLEncoding.DecodeString(policyValue)
	if err != nil {
		t.Fatalf("DecodeString returned error: %v", err)
	}
	var decoded struct {
		URLExpire int64 `json:"url_expire"`
	}
	if err := json.Unmarshal(rawPolicy, &decoded); err != nil {
		t.Fatalf("Unmarshal returned error: %v", err)
	}
	if decoded.URLExpire != time.Unix(1060, 0).UnixMilli() {
		t.Fatalf("url_expire = %d", decoded.URLExpire)
	}

	query.Del("signature")
	parsedURL.RawQuery = query.Encode()
	if signature != expectedSignature("secret", parsedURL.String()) {
		t.Fatalf("signature = %q, signed input = %q", signature, parsedURL.String())
	}
}

func TestSignerBuildsPlaybackAccessVariants(t *testing.T) {
	signer, err := NewSigner(Config{
		BaseURL: "https://rtc.example.com",
		Secret:  "secret",
		TTL:     time.Minute,
		Now: func() time.Time {
			return time.Unix(1000, 0).UTC()
		},
	})
	if err != nil {
		t.Fatalf("NewSigner returned error: %v", err)
	}

	access, err := signer.SignedPlaybackAccess("main")
	if err != nil {
		t.Fatalf("SignedPlaybackAccess returned error: %v", err)
	}

	if access.PlaybackURL == "" {
		t.Fatal("playback URL is empty")
	}
	if len(access.PlaybackVariants) != 1 {
		t.Fatalf("playback variants length = %d", len(access.PlaybackVariants))
	}
	variant := access.PlaybackVariants[0]
	if variant.ID != "source" {
		t.Fatalf("variant ID = %q", variant.ID)
	}
	if variant.Label != "元画質" {
		t.Fatalf("variant label = %q", variant.Label)
	}
	parsedURL, err := url.Parse(variant.PlaybackURL)
	if err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}
	if parsedURL.Path != "/live/main" {
		t.Fatalf("variant path = %q", parsedURL.Path)
	}
}

func TestSignerRejectsMissingSecret(t *testing.T) {
	_, err := NewSigner(Config{
		BaseURL: "https://rtc.example.com",
		TTL:     time.Minute,
	})
	if err == nil {
		t.Fatal("NewSigner returned nil error")
	}
}

func expectedSignature(secret string, value string) string {
	mac := hmac.New(sha1.New, []byte(secret))
	mac.Write([]byte(value))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
