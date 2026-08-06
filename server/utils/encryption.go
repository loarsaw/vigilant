package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"io"
)

func hashKey(passphrase string) []byte {
	hash := sha256.Sum256([]byte(passphrase))
	return hash[:]
}

func EncryptPrivateKey(key, passphrase string) (string, error) {
	block, err := aes.NewCipher(hashKey(passphrase))
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(key), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func DecryptPrivateKey(encryptedKey, passphrase string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encryptedKey)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(hashKey(passphrase))
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	nonce, ciphertext := data[:nonceSize], data[nonceSize:]

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
