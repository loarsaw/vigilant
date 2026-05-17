package call

import (
	"vigilant/config"

	"github.com/twilio/twilio-go"
)

type TwilioClient struct {
	client       *twilio.RestClient
	FromNumber   string
	AccountSID   string
	APIKeySID    string
	APIKeySecret string
	TwiMLAppSID  string
}

func NewTwilioClient(cfg *config.Config) *TwilioClient {
	client := twilio.NewRestClientWithParams(twilio.ClientParams{
		Username: cfg.TwilioAPIKeySID,
		Password: cfg.TwilioAPIKeySecret,
	})
	return &TwilioClient{
		client:       client,
		FromNumber:   cfg.TwilioFromNumber,
		AccountSID:   cfg.TwilioAccountSID,
		APIKeySID:    cfg.TwilioAPIKeySID,
		APIKeySecret: cfg.TwilioAPIKeySecret,
		TwiMLAppSID:  cfg.TwilioTwiMLAppSID,
	}
}
