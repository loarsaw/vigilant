package githubapi

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const apiBase = "https://api.github.com"

type Client struct {
	Token      string
	OrgName    string
	httpClient *http.Client
}

func NewClient(token, orgName string) *Client {
	return &Client{
		Token:   token,
		OrgName: orgName,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

type createRepoRequest struct {
	Name    string `json:"name"`
	Private bool   `json:"private"`
}

type createRepoResponse struct {
	HTMLURL string `json:"html_url"`
	Name    string `json:"name"`
}

func (c *Client) CreateRepo(repoName string) (repoURL string, err error) {
	body, err := json.Marshal(createRepoRequest{Name: repoName, Private: true})
	if err != nil {
		return "", fmt.Errorf("marshal create repo request: %w", err)
	}

	endpoint := fmt.Sprintf("%s/orgs/%s/repos", apiBase, url.PathEscape(c.OrgName))
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("create repo request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("github create repo failed: status %d: %s", resp.StatusCode, string(respBody))
	}

	var out createRepoResponse
	if err := json.Unmarshal(respBody, &out); err != nil {
		return "", fmt.Errorf("parse create repo response: %w", err)
	}

	return out.HTMLURL, nil
}

func (c *Client) InviteCollaborator(repoName, githubUsername, permission string) error {
	body, err := json.Marshal(map[string]string{"permission": permission})
	if err != nil {
		return fmt.Errorf("marshal invite request: %w", err)
	}

	endpoint := fmt.Sprintf("%s/repos/%s/%s/collaborators/%s",
		apiBase, url.PathEscape(c.OrgName), url.PathEscape(repoName), url.PathEscape(githubUsername))

	req, err := http.NewRequest(http.MethodPut, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("invite collaborator request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("github invite collaborator failed: status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

func (c *Client) setHeaders(req *http.Request) {
	req.Header.Set("Authorization", "Bearer "+c.Token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("Content-Type", "application/json")
}

func (c *Client) CreateFile(repoName, path, content, commitMessage string) error {
	encoded := base64.StdEncoding.EncodeToString([]byte(content))

	body, err := json.Marshal(map[string]string{
		"message": commitMessage,
		"content": encoded,
	})
	if err != nil {
		return fmt.Errorf("marshal create file request: %w", err)
	}

	endpoint := fmt.Sprintf("%s/repos/%s/%s/contents/%s",
		apiBase, url.PathEscape(c.OrgName), url.PathEscape(repoName), path)

	req, err := http.NewRequest(http.MethodPut, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("create file request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("github create file failed: status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

//

func ExtractUsername(repoURL string) (string, error) {
	u, err := url.Parse(repoURL)
	if err != nil {
		return "", fmt.Errorf("invalid repo URL: %w", err)
	}
	if !strings.Contains(u.Host, "github.com") {
		return "", fmt.Errorf("not a github.com URL: %s", repoURL)
	}

	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(parts) < 1 || parts[0] == "" {
		return "", fmt.Errorf("could not extract username from URL: %s", repoURL)
	}

	return parts[0], nil
}

//

func (c *Client) DeleteRepo(repoName string) error {
	endpoint := fmt.Sprintf("%s/repos/%s/%s", apiBase, url.PathEscape(c.OrgName), url.PathEscape(repoName))

	req, err := http.NewRequest(http.MethodDelete, endpoint, nil)
	if err != nil {
		return err
	}
	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("delete repo request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("github delete repo failed: status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}
