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
	publicBaseURL  *url.URL
	signingBaseURL *url.URL
	secret         []byte
	ttl            time.Duration
	now            func() time.Time
}

type Config struct {
	PublicBaseURL  string
	SigningBaseURL string
	Secret         string
	TTL            time.Duration
	Now            func() time.Time
}

type policy struct {
	URLExpire int64 `json:"url_expire"`
}

type PlaybackVariant struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	PlaybackURL string `json:"playbackUrl"`
}

type PlaybackAccess struct {
	PlaybackURL      string            `json:"playbackUrl"`
	PlaybackVariants []PlaybackVariant `json:"playbackVariants"`
}

type PlaybackPlaylist struct {
	Name       string
	FileName   string
	Renditions []string
}

func NewSigner(cfg Config) (*Signer, error) {
	publicBaseURL, err := parseBaseURL(cfg.PublicBaseURL, "stream public base url")
	if err != nil {
		return nil, err
	}
	signingBaseURL, err := parseBaseURL(cfg.SigningBaseURL, "stream signing base url")
	if err != nil {
		return nil, err
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

	publicBaseURL.Path = ""
	publicBaseURL.RawQuery = ""
	publicBaseURL.Fragment = ""

	signingBaseURL.Path = ""
	signingBaseURL.RawQuery = ""
	signingBaseURL.Fragment = ""
	signingBaseURL.Host = hostWithPort(signingBaseURL)

	return &Signer{
		publicBaseURL:  publicBaseURL,
		signingBaseURL: signingBaseURL,
		secret:         []byte(secret),
		ttl:            ttl,
		now:            now,
	}, nil
}

func parseBaseURL(value string, label string) (*url.URL, error) {
	baseURL, err := url.Parse(strings.TrimSpace(value))
	if err != nil {
		return nil, err
	}
	if baseURL.Scheme != "https" && baseURL.Scheme != "http" {
		return nil, errors.New(label + " must use http or https")
	}
	if baseURL.Host == "" {
		return nil, errors.New(label + " must include host")
	}
	return baseURL, nil
}

func (s *Signer) SignedPlaybackURL(roomID string) (string, error) {
	return s.signedPlaybackURL(roomID, "master")
}

func (s *Signer) SignedPlaybackAccess(roomID string, playlists []PlaybackPlaylist) (PlaybackAccess, error) {
	autoURL, err := s.signedPlaybackURL(roomID, "master")
	if err != nil {
		return PlaybackAccess{}, err
	}
	variants := make([]PlaybackVariant, 0, len(playlists))
	seen := map[string]struct{}{"master": {}}
	for _, playlist := range playlists {
		fileName := strings.TrimSpace(playlist.FileName)
		if fileName == "" {
			continue
		}
		if _, ok := seen[fileName]; ok {
			continue
		}
		seen[fileName] = struct{}{}
		playbackURL, err := s.signedPlaybackURL(roomID, fileName)
		if err != nil {
			return PlaybackAccess{}, err
		}
		variants = append(variants, PlaybackVariant{
			ID:          fileName,
			Label:       playbackLabel(playlist),
			PlaybackURL: playbackURL,
		})
	}
	return PlaybackAccess{
		PlaybackURL:      autoURL,
		PlaybackVariants: variants,
	}, nil
}

func playbackLabel(playlist PlaybackPlaylist) string {
	if len(playlist.Renditions) == 1 && strings.TrimSpace(playlist.Renditions[0]) != "" {
		return strings.TrimSpace(playlist.Renditions[0])
	}
	if strings.TrimSpace(playlist.Name) != "" {
		return strings.TrimSpace(playlist.Name)
	}
	return playlist.FileName
}

func (s *Signer) signedPlaybackURL(roomID string, playlistName string) (string, error) {
	policyValue, err := s.encodedPolicy()
	if err != nil {
		return "", err
	}

	publicURL := *s.publicBaseURL
	publicURL.Scheme = playbackScheme(publicURL.Scheme)
	publicURL.Path = "/live/" + url.PathEscape(roomID)
	if playlistName != "" {
		publicURL.Path += "/" + url.PathEscape(playlistName)
	}
	query := publicURL.Query()
	query.Set("policy", policyValue)
	publicURL.RawQuery = query.Encode()

	signingURL := *s.signingBaseURL
	signingURL.Scheme = playbackScheme(signingURL.Scheme)
	signingURL.Path = publicURL.Path
	signingURL.RawQuery = publicURL.RawQuery

	signature := sign(s.secret, signingURL.String())
	query.Set("signature", signature)
	publicURL.RawQuery = query.Encode()
	return publicURL.String(), nil
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
