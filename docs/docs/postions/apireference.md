---
id: api-reference
title: API Reference
sidebar_label: API Reference
sidebar_position: 3
description: Full request/response details for the public positions endpoints.
---

:::note Field names
Exact `Position` and application field names below are placeholders pending
the real Go struct — update once confirmed.
:::

## List positions

```
GET /api/v1/public/positions
```

Returns all currently open/published positions.

**Auth:** None

### Response `200`

```json
{
  "positions": [
    {
      "id": "pos_123",
      "title": "Senior Backend Engineer",
      "department": "Engineering",
      "location": "Remote",
      "employment_type": "full_time",
      "created_at": "2026-07-01T10:00:00Z"
    }
  ]
}
```

---

## Get position by ID

```
GET /api/v1/public/positions/:id
```

Returns full details for a single position — use this for a job detail page.

**Auth:** None

### Path parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | The position identifier. |

### Response `200`

```json
{
  "id": "pos_123",
  "title": "Senior Backend Engineer",
  "description": "We're looking for...",
  "department": "Engineering",
  "location": "Remote",
  "employment_type": "full_time",
  "created_at": "2026-07-01T10:00:00Z"
}
```

### Errors

| Status | Meaning |
|---|---|
| `404` | No position exists with that ID (or it's no longer open). |

---

## Apply for a position

```
POST /api/v1/public/positions/:id/apply
```

Submits a job application. No candidate account required.

**Auth:** None

### Path parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | The position being applied to. |

### Request body

```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1-555-0100",
  "resume_url": "https://...",
  "cover_letter": "..."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `full_name` | string | Yes | Applicant's full name. |
| `email` | string | Yes | Applicant's email address. |
| `phone` | string | No | Contact number. |
| `resume_url` | string | Yes | Link to an uploaded resume/CV. |
| `cover_letter` | string | No | Free-text cover letter. |

### Response `200`

```json
{
  "application_id": "app_456",
  "status": "submitted"
}
```

### Errors

| Status | Meaning |
|---|---|
| `400` | Missing or invalid fields — check the response body for details. |
| `404` | Position not found or no longer accepting applications. |
| `429` | Rate limit exceeded — see [CORS & Rate Limits](./cors-and-rate-limits). |