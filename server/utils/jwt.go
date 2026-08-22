package utils

import (
	"time"

	"vigilant/config"

	"github.com/golang-jwt/jwt/v5"
)

type CandidateClaims struct {
	CandidateID string `json:"candidate_id"`
	Email       string `json:"email"`
	SessionID   string `json:"session_id,omitempty"`
	TokenType   string `json:"token_type,omitempty"`
	jwt.RegisteredClaims
}

func IssueCandidateJWT(cfg *config.Config, candidateID, email, sessionID string, validFor time.Duration) (string, error) {
	return issueCandidateToken(cfg, candidateID, email, sessionID, "access", validFor)
}

func issueCandidateToken(cfg *config.Config, candidateID, email, sessionID, tokenType string, validFor time.Duration) (string, error) {
	claims := CandidateClaims{
		CandidateID: candidateID,
		Email:       email,
		SessionID:   sessionID,
		TokenType:   tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(validFor)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   candidateID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func ParseCandidateJWT(cfg *config.Config, rawToken string) (*CandidateClaims, error) {
	claims := &CandidateClaims{}
	jwtToken, err := jwt.ParseWithClaims(rawToken, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(cfg.JWTSecret), nil
	})
	if err != nil || !jwtToken.Valid {
		return nil, jwt.ErrTokenExpired
	}
	return claims, nil
}
