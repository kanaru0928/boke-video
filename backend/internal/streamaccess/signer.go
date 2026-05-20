package streamaccess

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net"
	"net/url"
	"strings"
	"time"
)

type Signer struct {
	baseURL *url.URL
	secret  []byte
	ttl     time.Duration
	now     func() time.Time
}

type Config struct {
	BaseURL string
	Secret  string
	TTL     time.Duration
	Now     func() time.Time
}

type policy struct {
	URLExpire int64 `json:"url_expire"`
}

func NewSigner(cfg Config) (*Signer, error) {
	baseURL, err := url.Parse(strings.TrimSpace(cfg.BaseURL))
	if err != nil {
		return nil, err
	}
	if baseURL.Scheme != "https" && baseURL.Scheme != "http" {
		return nil, errors.New("stream base url must use http or https")
	}
	if baseURL.Host == "" {
		return nil, errors.New("stream base url must include host")
	}
	secret := strings.TrimSpace(cfg.Secret)
	if secret == "" {
		return nil, errors.New("stream signing secret is required")
	}
	ttl := cfg.TTL
	if ttl <= 0 {
		return nil, errors.New("stream access ttl must be positive")
	}
	now := cfg.Now
	if now == nil {
		now = time.Now
	}

	baseURL.Path = ""
	baseURL.RawQuery = ""
	baseURL.Fragment = ""
	baseURL.Host = hostWithPort(baseURL)

	return &Signer{
		baseURL: baseURL,
		secret:  []byte(secret),
		ttl:     ttl,
		now:     now,
	}, nil
}

func (s *Signer) SignedPlaybackURL(roomID string) (string, error) {
	policyValue, err := s.encodedPolicy()
	if err != nil {
		return "", err
	}

	signedURL := *s.baseURL
	signedURL.Scheme = playbackScheme(signedURL.Scheme)
	signedURL.Path = "/live/" + url.PathEscape(roomID)
	query := signedURL.Query()
	query.Set("policy", policyValue)
	signedURL.RawQuery = query.Encode()

	signature := sign(s.secret, signedURL.String())
	query.Set("signature", signature)
	signedURL.RawQuery = query.Encode()
	return signedURL.String(), nil
}

func playbackScheme(scheme string) string {
	if scheme == "https" {
		return "wss"
	}
	return "ws"
}

func (s *Signer) encodedPolicy() (string, error) {
	rawPolicy, err := json.Marshal(policy{
		URLExpire: s.now().Add(s.ttl).UnixMilli(),
	})
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(rawPolicy), nil
}

func sign(secret []byte, value string) string {
	mac := hmac.New(sha1.New, secret)
	mac.Write([]byte(value))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func hostWithPort(baseURL *url.URL) string {
	if baseURL.Port() != "" {
		return baseURL.Host
	}
	switch baseURL.Scheme {
	case "https":
		return net.JoinHostPort(baseURL.Hostname(), "443")
	case "http":
		return net.JoinHostPort(baseURL.Hostname(), "80")
	default:
		return baseURL.Host
	}
}
