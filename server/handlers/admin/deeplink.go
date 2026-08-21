// server/handlers/admin/deeplink.go
package admin

import "net/url"

func buildInterviewDeepLink(domainName, candidateEmail, candidateJWT, sessionID, livekitToken, livekitHost string) string {
	v := url.Values{}
	v.Set("domain_name", domainName)
	v.Set("username", candidateEmail)
	v.Set("candidate_jwt", candidateJWT)
	v.Set("session_id", sessionID)
	v.Set("livekit_token", livekitToken)
	v.Set("livekit_host", livekitHost)
	return "vigilant-code://login?" + v.Encode()
}
