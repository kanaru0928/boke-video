package whipproxy

import (
	"context"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

type contextKey string

const (
	externalSchemeKey contextKey = "externalScheme"
	externalHostKey   contextKey = "externalHost"
)

type Proxy struct {
	upstream *url.URL
	proxy    *httputil.ReverseProxy
}

func New(upstreamBaseURL string) (*Proxy, error) {
	upstream, err := url.Parse(strings.TrimSpace(upstreamBaseURL))
	if err != nil {
		return nil, err
	}
	proxy := httputil.NewSingleHostReverseProxy(upstream)
	originalDirector := proxy.Director
	proxy.Director = func(r *http.Request) {
		originalDirector(r)
		r.Header.Del("Authorization")
	}
	proxy.ModifyResponse = func(response *http.Response) error {
		rewriteLocation(response, upstream)
		return nil
	}
	return &Proxy{upstream: upstream, proxy: proxy}, nil
}

func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := context.WithValue(r.Context(), externalSchemeKey, externalScheme(r))
	ctx = context.WithValue(ctx, externalHostKey, externalHost(r))
	p.proxy.ServeHTTP(w, r.WithContext(ctx))
}

func rewriteLocation(response *http.Response, upstream *url.URL) {
	rawLocation := response.Header.Get("Location")
	if rawLocation == "" {
		return
	}
	location, err := url.Parse(rawLocation)
	if err != nil {
		return
	}
	request := response.Request
	scheme := request.Context().Value(externalSchemeKey).(string)
	host := request.Context().Value(externalHostKey).(string)
	if location.Host != upstream.Host && location.Host != host {
		return
	}
	location.Scheme = scheme
	location.Host = host
	response.Header.Set("Location", location.String())
}

func externalScheme(r *http.Request) string {
	if scheme := r.Header.Get("X-Forwarded-Proto"); scheme != "" {
		return scheme
	}
	if r.TLS != nil {
		return "https"
	}
	return "http"
}

func externalHost(r *http.Request) string {
	if host := r.Header.Get("X-Forwarded-Host"); host != "" {
		return host
	}
	return r.Host
}
