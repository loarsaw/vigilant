// server/middleware/rate-limit.go
package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"vigilant/config"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type IPRateLimiter struct {
	ips map[string]*rate.Limiter
	mu  *sync.RWMutex
	r   rate.Limit // requests per second
	b   int        // burst size
}

// NewIPRateLimiter creates a new IP-based rate limiter
// r: requests per second
// b: burst size
func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	limiter := &IPRateLimiter{
		ips: make(map[string]*rate.Limiter),
		mu:  &sync.RWMutex{},
		r:   r,
		b:   b,
	}
	// Start cleanup routine to prevent memory leaks
	go limiter.cleanupRoutine()
	return limiter
}

// AddIP creates a new rate limiter for an IP
func (i *IPRateLimiter) AddIP(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()
	limiter := rate.NewLimiter(i.r, i.b)
	i.ips[ip] = limiter
	return limiter
}

// GetLimiter returns the rate limiter for an IP
func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
	i.mu.RLock()
	limiter, exists := i.ips[ip]
	i.mu.RUnlock()
	if !exists {
		return i.AddIP(ip)
	}
	return limiter
}

// cleanupRoutine periodically removes old IP entries to prevent memory leaks
func (i *IPRateLimiter) cleanupRoutine() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		i.mu.Lock()
		i.ips = make(map[string]*rate.Limiter)
		i.mu.Unlock()
	}
}

// RateLimitMiddleware creates a rate limiting middleware
func RateLimitMiddleware(limiter *IPRateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		ipLimiter := limiter.GetLimiter(ip)
		if !ipLimiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate limit exceeded",
				"message": "too many requests, please try again later",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

var (
	// HealthLimiter - Very lenient for health checks
	// 1000 requests per second with burst of 2000
	HealthLimiter = NewIPRateLimiter(rate.Limit(1000), 2000)

	// AuthLimiter - Very strict for authentication endpoints
	// 5 requests per second with burst of 10
	AuthLimiter = NewIPRateLimiter(rate.Limit(5), 10)

	// AdminLimiter - Strict for admin endpoints
	// 10 requests per second with burst of 20
	AdminLimiter = NewIPRateLimiter(rate.Limit(10), 20)

	// APILimiter - Moderate for general API endpoints
	// 50 requests per second with burst of 100
	APILimiter = NewIPRateLimiter(rate.Limit(50), 100)

	// PublicLimiter - Lenient for public endpoints
	// 100 requests per second with burst of 200
	PublicLimiter = NewIPRateLimiter(rate.Limit(100), 200)

	// UploadLimiter - Very strict for file uploads
	// 2 requests per second with burst of 5
	UploadLimiter = NewIPRateLimiter(rate.Limit(2), 5)

	// JudgeLimiter - Moderate for code execution
	// 10 requests per second with burst of 20
	JudgeLimiter = NewIPRateLimiter(rate.Limit(10), 20)

	// SSELimiter - Lenient for Server-Sent Events
	// 5 requests per second with burst of 10
	SSELimiter = NewIPRateLimiter(rate.Limit(5), 10)

	// ApplyLimiter - Strict for the public, unauthenticated job application
	// endpoint. This is a write endpoint anyone on the internet can hit with
	// no login required, so it's tuned much tighter than APILimiter/PublicLimiter:
	// ~1 request every 10 seconds sustained, small burst for legitimate
	// double-submits/retries. Deliberately not keyed any looser than this —
	// a real applicant does not submit the same form dozens of times a minute,
	// but a scraper/bot filling every open position would.
	ApplyLimiter = NewIPRateLimiter(rate.Limit(0.1), 3)

	// PasscodeLimiter - Strict for the public, unauthenticated room-passcode
	// verification endpoint. A passcode is a short, guessable secret (12 chars),
	// so this endpoint is a brute-force target if left at APILimiter/PublicLimiter
	// rates. Tuned similarly to ApplyLimiter: a real candidate verifies their
	// passcode once (maybe a couple retries), a script trying to guess codes
	// would hit this far more often.
	PasscodeLimiter = NewIPRateLimiter(rate.Limit(0.2), 5)
)

func InitLimiters(cfg *config.Config) {
	rateLimitPerMin, err := strconv.Atoi(cfg.RateLimitPerMinute)
	if err != nil || rateLimitPerMin <= 0 {
		rateLimitPerMin = 120 // fallback
	}

	ratePerSecond := rate.Limit(float64(rateLimitPerMin) / 60.0)
	burst := rateLimitPerMin // burst = full minute's allowance

	APILimiter = NewIPRateLimiter(ratePerSecond, burst)
}

func CustomRateLimitMiddleware(requestsPerSecond float64, burst int) gin.HandlerFunc {
	limiter := NewIPRateLimiter(rate.Limit(requestsPerSecond), burst)
	return RateLimitMiddleware(limiter)
}
