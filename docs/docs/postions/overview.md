---
id: overview
title: Overview
sidebar_label: Overview
sidebar_position: 1
description: Build a custom careers page against Vigilant's public positions API.
---

If you're hosting Vigilant and want to show open positions on your own
website (rather than using a Vigilant-hosted page), you can build your own
careers page against a small public API. It lets you:

- **List** all open positions
- **Get details** for a single position
- **Submit an application** on a candidate's behalf

These endpoints are **public and unauthenticated** — they're designed to be
called directly from a browser, on a domain you control, with no API key or
login required.

:::tip What you don't need
You don't need an account, API key, or session to use these endpoints. If
you're seeing auth errors, you're probably looking at the wrong endpoint —
these three are intentionally open.
:::

## What you can build

- A "Careers" or "Jobs" page on your marketing site that always reflects
  current openings
- A custom application form with your own branding, instead of redirecting
  candidates to a Vigilant-hosted page
- A job board widget embedded in an existing site

## Where to go next

- **[Quickstart](./quickstart)** — copy-pasteable example: list positions, show one, submit an application.
- **[API Reference](./api-reference)** — full request/response details for all three endpoints.
- **[CORS & Rate Limits](./cors-and-rate-limits)** — what to know before calling this from your own domain.