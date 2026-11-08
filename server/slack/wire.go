// server/slack/wire.go
package slack

import (
	"database/sql"

	"vigilant/email"
)

type emailCipher struct{ key []byte }

func (c emailCipher) Encrypt(p string) (string, error) { return email.Encrypt(p, c.key) }
func (c emailCipher) Decrypt(p string) (string, error) { return email.Decrypt(p, c.key) }

func NewFromConfig(db *sql.DB, encryptionKey string) (*Service, error) {
	key, err := email.DecodeKey(encryptionKey)
	if err != nil {
		return nil, err
	}
	return NewService(db, emailCipher{key: key}), nil
}
