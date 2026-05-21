package streammonitor

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"
)

var ErrStreamNotFound = errors.New("stream not found")

type OvenMediaEngineClient struct {
	apiBaseURL       *url.URL
	thumbnailBaseURL *url.URL
	accessToken      string
	vhostName        string
	appName          string
	thumbnailCodec   string
	httpClient       *http.Client
}

type OvenMediaEngineConfig struct {
	APIBaseURL       string
	ThumbnailBaseURL string
	AccessToken      string
	VhostName        string
	AppName          string
	ThumbnailCodec   string
	HTTPClient       *http.Client
}

type StreamSnapshot struct {
	Active    bool
	StartedAt *time.Time
}

type PlaybackPlaylist struct {
	Name       string
	FileName   string
	Renditions []string
}

type Thumbnail struct {
	ContentType string
	Body        io.ReadCloser
}

func NewOvenMediaEngineClient(cfg OvenMediaEngineConfig) (*OvenMediaEngineClient, error) {
	apiBaseURL, err := parseBaseURL(cfg.APIBaseURL)
	if err != nil {
		return nil, fmt.Errorf("api base url: %w", err)
	}
	thumbnailBaseURL, err := parseBaseURL(cfg.ThumbnailBaseURL)
	if err != nil {
		return nil, fmt.Errorf("thumbnail base url: %w", err)
	}
	vhostName := strings.TrimSpace(cfg.VhostName)
	if vhostName == "" {
		vhostName = "default"
	}
	appName := strings.TrimSpace(cfg.AppName)
	if appName == "" {
		appName = "live"
	}
	thumbnailCodec := strings.Trim(strings.ToLower(cfg.ThumbnailCodec), ".")
	if thumbnailCodec == "" {
		thumbnailCodec = "jpg"
	}
	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 5 * time.Second}
	}
	return &OvenMediaEngineClient{
		apiBaseURL:       apiBaseURL,
		thumbnailBaseURL: thumbnailBaseURL,
		accessToken:      cfg.AccessToken,
		vhostName:        vhostName,
		appName:          appName,
		thumbnailCodec:   thumbnailCodec,
		httpClient:       httpClient,
	}, nil
}

func (c *OvenMediaEngineClient) InspectStream(ctx context.Context, streamName string) (StreamSnapshot, error) {
	streams, err := c.ListStreams(ctx)
	if err != nil {
		return StreamSnapshot{}, err
	}
	if _, ok := streams[streamName]; !ok {
		return StreamSnapshot{Active: false}, nil
	}
	return StreamSnapshot{Active: true}, nil
}

func (c *OvenMediaEngineClient) ListStreams(ctx context.Context) (map[string]StreamSnapshot, error) {
	endpoint := c.apiEndpoint("v1", "vhosts", c.vhostName, "apps", c.appName, "streams")
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	c.authorize(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("list streams: %s", resp.Status)
	}

	var parsed streamListResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	streams := make(map[string]StreamSnapshot, len(parsed.Response))
	for _, streamName := range parsed.Response {
		streams[streamName] = StreamSnapshot{Active: true}
	}
	return streams, nil
}

func (c *OvenMediaEngineClient) PlaybackPlaylists(ctx context.Context, streamName string) ([]PlaybackPlaylist, error) {
	endpoint := c.apiEndpoint("v1", "vhosts", c.vhostName, "apps", c.appName, "streams", streamName)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	c.authorize(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrStreamNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("get stream: %s", resp.Status)
	}

	var parsed streamDetailResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	playlists := []PlaybackPlaylist{}
	masterRenditions := []string{}
	for _, output := range parsed.Response.Outputs {
		for _, playlist := range output.Playlists {
			renditionNames := make([]string, 0, len(playlist.Renditions))
			for _, rendition := range playlist.Renditions {
				if strings.TrimSpace(rendition.Name) != "" {
					renditionNames = append(renditionNames, strings.TrimSpace(rendition.Name))
				}
			}
			if strings.TrimSpace(playlist.FileName) == "" || len(renditionNames) == 0 {
				continue
			}
			if isGeneratedDefaultPlaylist(playlist) {
				continue
			}
			if strings.TrimSpace(playlist.FileName) == "master" {
				masterRenditions = renditionNames
			}
			playlists = append(playlists, PlaybackPlaylist{
				Name:       strings.TrimSpace(playlist.Name),
				FileName:   strings.TrimSpace(playlist.FileName),
				Renditions: renditionNames,
			})
		}
	}
	return labelSimulcastPlaylists(playlists, masterRenditions), nil
}

func (c *OvenMediaEngineClient) FetchThumbnail(ctx context.Context, streamName string) (Thumbnail, error) {
	endpoint := *c.thumbnailBaseURL
	endpoint.Path = joinURLPath(endpoint.Path, c.appName, streamName, "thumb."+c.thumbnailCodec)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return Thumbnail{}, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return Thumbnail{}, err
	}
	if resp.StatusCode == http.StatusNotFound {
		resp.Body.Close()
		return Thumbnail{}, ErrStreamNotFound
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		resp.Body.Close()
		return Thumbnail{}, fmt.Errorf("fetch thumbnail: %s", resp.Status)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}
	return Thumbnail{
		ContentType: contentType,
		Body:        resp.Body,
	}, nil
}

func (c *OvenMediaEngineClient) apiEndpoint(parts ...string) string {
	endpoint := *c.apiBaseURL
	endpoint.Path = joinURLPath(endpoint.Path, parts...)
	return endpoint.String()
}

func (c *OvenMediaEngineClient) authorize(req *http.Request) {
	if c.accessToken == "" {
		return
	}
	credentials := base64.StdEncoding.EncodeToString([]byte(c.accessToken))
	req.Header.Set("Authorization", "Basic "+credentials)
}

type streamListResponse struct {
	Response []string `json:"response"`
}

type streamDetailResponse struct {
	Response struct {
		Outputs []struct {
			Playlists []streamDetailPlaylist `json:"playlists"`
		} `json:"outputs"`
	} `json:"response"`
}

type streamDetailPlaylist struct {
	Name       string `json:"name"`
	FileName   string `json:"fileName"`
	Renditions []struct {
		Name string `json:"name"`
	} `json:"renditions"`
}

func isGeneratedDefaultPlaylist(playlist streamDetailPlaylist) bool {
	fileName := strings.TrimSpace(playlist.FileName)
	name := strings.TrimSpace(playlist.Name)
	return fileName == "webrtc_default" || name == "webrtc_default"
}

func labelSimulcastPlaylists(
	playlists []PlaybackPlaylist,
	masterRenditions []string,
) []PlaybackPlaylist {
	if len(masterRenditions) == 0 {
		return playlists
	}
	for index, playlist := range playlists {
		renditionIndex, ok := simulcastLayerIndex(playlist.FileName)
		if !ok || renditionIndex >= len(masterRenditions) {
			continue
		}
		playlists[index].Renditions = []string{masterRenditions[renditionIndex]}
	}
	return playlists
}

func simulcastLayerIndex(fileName string) (int, bool) {
	value, ok := strings.CutPrefix(strings.TrimSpace(fileName), "layer-")
	if !ok {
		return 0, false
	}
	layerNumber, err := strconv.Atoi(value)
	if err != nil || layerNumber <= 0 {
		return 0, false
	}
	return layerNumber - 1, true
}

func parseBaseURL(rawValue string) (*url.URL, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawValue))
	if err != nil {
		return nil, err
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return nil, errors.New("absolute url is required")
	}
	return parsed, nil
}

func joinURLPath(basePath string, parts ...string) string {
	segments := []string{basePath}
	segments = append(segments, parts...)
	return path.Join(segments...)
}
