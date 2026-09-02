// src/lib/validators/github.ts

const GITHUB_PREFIXED_TOKEN_RE = /^(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}$/;
const GITHUB_FINE_GRAINED_TOKEN_RE = /^github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59}$/;
const GITHUB_LEGACY_TOKEN_RE = /^[a-f0-9]{40}$/;
const GITHUB_ORG_NAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

export function isValidGithubToken(token: string): boolean {
  const t = token.trim();
  if (!t) return false;
  return (
    GITHUB_PREFIXED_TOKEN_RE.test(t) ||
    GITHUB_FINE_GRAINED_TOKEN_RE.test(t) ||
    GITHUB_LEGACY_TOKEN_RE.test(t)
  );
}

export function isValidGithubOrgName(orgName: string): boolean {
  const o = orgName.trim();
  if (!o || o.length > 39) return false;
  return GITHUB_ORG_NAME_RE.test(o);
}

export function getGithubTokenError(token: string): string | null {
  const t = token.trim();
  if (!t) return "Token is required";
  if (!isValidGithubToken(t)) {
    return "Doesn't look like a valid GitHub token (expected ghp_, github_pat_, gho_, ghu_, ghs_, or a 40-char classic token)";
  }
  return null;
}

export function getGithubOrgNameError(orgName: string): string | null {
  const o = orgName.trim();
  if (!o) return "Organization name is required";
  if (o.length > 39) return "Must be 39 characters or fewer";
  if (!isValidGithubOrgName(o)) {
    return "Only letters, numbers, and hyphens — no leading, trailing, or double hyphens";
  }
  return null;
}
