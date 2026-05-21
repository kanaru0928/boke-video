package httpapi

import (
	"sync"
	"time"
)

type rateLimiter struct {
	mu       sync.Mutex
	interval time.Duration
	lastSeen map[string]time.Time
}

func newRateLimiter(interval time.Duration) *rateLimiter {
	return &rateLimiter{
		interval: interval,
		lastSeen: map[string]time.Time{},
	}
}

func (r *rateLimiter) Allow(key string) bool {
	now := time.Now()
	r.mu.Lock()
	defer r.mu.Unlock()

	lastSeen, ok := r.lastSeen[key]
	if ok && now.Sub(lastSeen) < r.interval {
		return false
	}
	r.lastSeen[key] = now
	return true
}
