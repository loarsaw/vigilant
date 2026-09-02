package analyzer

import (
	"fmt"

	"vigilant/email"
)

func decryptToken(ciphertext, base64Key string) (string, error) {
	key, err := email.DecodeKey(base64Key)
	if err != nil {
		return "", fmt.Errorf("decode encryption key: %w", err)
	}
	return email.Decrypt(ciphertext, key)
}

func encryptToken(plaintext, base64Key string) (string, error) {
	key, err := email.DecodeKey(base64Key)
	if err != nil {
		return "", fmt.Errorf("decode encryption key: %w", err)
	}
	return email.Encrypt(plaintext, key)
}
