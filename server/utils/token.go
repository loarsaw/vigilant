// server/utils/token.go
package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
)

// GenerateToken returns a new random access token pair:
// rawToken is emailed to the candidate as part of the link and never stored.
// tokenHash is what gets persisted in the DB (candidate_access_links.token_hash).
func GenerateToken() (rawToken string, tokenHash string, err error) {
	b := make([]byte, 32) // 256 bits of entropy
	if _, err = rand.Read(b); err != nil {
		return "", "", fmt.Errorf("failed to generate random token: %w", err)
	}
	rawToken = base64.RawURLEncoding.EncodeToString(b)
	tokenHash = HashToken(rawToken)
	return rawToken, tokenHash, nil
}

// HashToken deterministically hashes a raw token for storage/lookup.
// Same raw token always produces the same hash, so it can be used both
// to store a new token and to look up an existing one by its raw value.
func HashToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}

// Avoids ambiguous chars: 0/O, 1/I/L
const passcodeChars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

func GeneratePasscode(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("read random bytes: %w", err)
	}
	for i := range b {
		b[i] = passcodeChars[int(b[i])%len(passcodeChars)]
	}
	return string(b), nil
}
