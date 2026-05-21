package access

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Principal struct {
	Subject string
}

type VerifierConfig struct {
	Enabled  bool
	Audience string
	Issuer   string
	CertsURL string
}

type Verifier struct {
	enabled  bool
	audience string
	issuer   string
	certsURL string

	mu        sync.RWMutex
	keys      map[string]*rsa.PublicKey
	keysUntil time.Time
}

func NewVerifier(cfg VerifierConfig) *Verifier {
	return &Verifier{
		enabled:  cfg.Enabled,
		audience: cfg.Audience,
		issuer:   cfg.Issuer,
		certsURL: cfg.CertsURL,
		keys:     map[string]*rsa.PublicKey{},
	}
}

func (v *Verifier) VerifyRequest(ctx context.Context, r *http.Request) (Principal, error) {
	if !v.enabled {
		return Principal{Subject: "local-dev"}, nil
	}

	tokenText := r.Header.Get("Cf-Access-Jwt-Assertion")
	if tokenText == "" {
		return Principal{}, errors.New("missing Cf-Access-Jwt-Assertion")
	}

	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenText, claims, func(token *jwt.Token) (any, error) {
		if token.Method.Alg() != jwt.SigningMethodRS256.Alg() {
			return nil, errors.New("unsupported signing method")
		}

		kid, ok := token.Header["kid"].(string)
		if !ok || kid == "" {
			return nil, errors.New("missing key id")
		}

		return v.key(ctx, kid)
	}, jwt.WithAudience(v.audience), jwt.WithIssuer(v.issuer), jwt.WithExpirationRequired())
	if err != nil {
		return Principal{}, err
	}
	if !token.Valid {
		return Principal{}, errors.New("invalid token")
	}

	subject, err := claims.GetSubject()
	if err != nil || subject == "" {
		return Principal{}, errors.New("missing subject")
	}

	return Principal{Subject: subject}, nil
}

func (v *Verifier) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.RLock()
	if key := v.keys[kid]; key != nil && time.Now().Before(v.keysUntil) {
		v.mu.RUnlock()
		return key, nil
	}
	v.mu.RUnlock()

	if err := v.refreshKeys(ctx); err != nil {
		return nil, err
	}

	v.mu.RLock()
	defer v.mu.RUnlock()
	key := v.keys[kid]
	if key == nil {
		return nil, errors.New("unknown key id")
	}
	return key, nil
}

func (v *Verifier) refreshKeys(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.certsURL, nil)
	if err != nil {
		return err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return errors.New("failed to fetch access certs")
	}

	var jwks struct {
		Keys []struct {
			Kid string `json:"kid"`
			Kty string `json:"kty"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return err
	}

	keys := map[string]*rsa.PublicKey{}
	for _, jwk := range jwks.Keys {
		if jwk.Kty != "RSA" || jwk.Kid == "" {
			continue
		}
		key, err := rsaPublicKey(jwk.N, jwk.E)
		if err != nil {
			return err
		}
		keys[jwk.Kid] = key
	}
	if len(keys) == 0 {
		return errors.New("no rsa keys in access certs")
	}

	v.mu.Lock()
	v.keys = keys
	v.keysUntil = time.Now().Add(6 * time.Hour)
	v.mu.Unlock()
	return nil
}

func rsaPublicKey(modulus string, exponent string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(modulus, "="))
	if err != nil {
		return nil, err
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(exponent, "="))
	if err != nil {
		return nil, err
	}

	e := 0
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}
	if e == 0 {
		return nil, errors.New("invalid exponent")
	}

	return &rsa.PublicKey{N: new(big.Int).SetBytes(nBytes), E: e}, nil
}
