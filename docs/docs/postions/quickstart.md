---
id: quickstart
title: Quickstart
sidebar_label: Quickstart
sidebar_position: 2
description: List positions, show one, and submit an application in a few lines of code.
---

This walks through the three calls you need to build a basic careers page:
list open positions, fetch one position's details, and submit an
application.

Replace `https://your-vigilant-instance.com` with your own hosted domain
throughout.

## 1. List open positions

```js
async function getOpenPositions() {
  const res = await fetch("https://your-vigilant-instance.com/api/v1/public/positions");
  if (!res.ok) throw new Error(`Failed to load positions: ${res.status}`);
  const data = await res.json();
  return data.positions;
}
```

```jsx
function CareersPage() {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    getOpenPositions().then(setPositions).catch(console.error);
  }, []);

  return (
    <ul>
      {positions.map((p) => (
        <li key={p.id}>
          <a href={`/careers/${p.id}`}>{p.title}</a> — {p.location}
        </li>
      ))}
    </ul>
  );
}
```

## 2. Get a single position's details

```js
async function getPosition(id) {
  const res = await fetch(`https://your-vigilant-instance.com/api/v1/public/positions/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load position: ${res.status}`);
  return res.json();
}
```

Use this to render a job detail page at a route like `/careers/:id`.

## 3. Submit an application

```js
async function applyToPosition(id, application) {
  const res = await fetch(`https://your-vigilant-instance.com/api/v1/public/positions/${id}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(application),
  });

  if (res.status === 429) {
    throw new Error("Too many attempts — please wait a moment and try again.");
  }
  if (!res.ok) throw new Error(`Application failed: ${res.status}`);

  return res.json();
}
```

```jsx
async function handleSubmit(formData, positionId) {
  try {
    const result = await applyToPosition(positionId, {
      full_name: formData.name,
      email: formData.email,
      phone: formData.phone,
      resume_url: formData.resumeUrl,
      cover_letter: formData.coverLetter,
    });
    console.log("Application submitted:", result.application_id);
  } catch (err) {
    console.error(err);
  }
}
```

That's the whole integration. See the [API Reference](./api-reference) for
full field and error details, and [CORS & Rate Limits](./cors-and-rate-limits)
before you ship this to production.