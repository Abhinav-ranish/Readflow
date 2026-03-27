# Readflow — AI Agent Instructions

Readflow is a web-based markdown editor. Use this API to programmatically create shareable read-only markdown documents. No authentication or API key required.

## API Endpoint

`POST https://readflow.vercel.app/api/share`

### Request

```json
{
  "content": "# Your Markdown\n\nFull markdown content here...",
  "title": "Optional Document Title"
}
```

| Field     | Type   | Required | Description                              |
|-----------|--------|----------|------------------------------------------|
| `content` | string | Yes      | Raw markdown content                     |
| `title`   | string | No       | Document title (max 100 chars). Used for page title, OG metadata, and download filenames. |

### Response (200)

```json
{
  "id": "abc123xyz",
  "url": "https://readflow.vercel.app/s/abc123xyz"
}
```

### Errors

| Status | Meaning                    |
|--------|----------------------------|
| 400    | Missing or invalid content |
| 429    | Rate limited (25/hour/IP)  |
| 500    | Server error               |

## How to Use

When a user asks you to "share this on Readflow", "put this readme on Readflow", "create a Readflow link", or similar:

1. Gather the markdown content (from a file, generated output, or user input)
2. Send a POST request to `https://readflow.vercel.app/api/share` with JSON body `{"content": "<markdown>", "title": "<optional title>"}`
3. Return the `url` field from the response to the user

### curl

```bash
curl -s -X POST https://readflow.vercel.app/api/share \
  -H "Content-Type: application/json" \
  -d '{"content": "# Hello World\n\nThis is a test.", "title": "Hello World"}' \
  | jq -r '.url'
```

### Share a local file

```bash
jq -Rs '{content: ., title: "My README"}' README.md \
  | curl -s -X POST https://readflow.vercel.app/api/share \
    -H "Content-Type: application/json" -d @- \
  | jq -r '.url'
```

### Python

```python
import requests

resp = requests.post("https://readflow.vercel.app/api/share", json={
    "content": markdown_string,
    "title": "My Document"
})
print(resp.json()["url"])
```

### Node.js / fetch

```typescript
const resp = await fetch("https://readflow.vercel.app/api/share", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content: markdownString, title: "My Doc" }),
});
const { url } = await resp.json();
```

## What the shared page provides

- Rendered markdown with syntax highlighting
- Download as `.md` file (uses title as filename)
- Download as PDF (uses title as filename)
- Rich Open Graph previews in Discord, Slack, Twitter, etc.
- Mobile-responsive read-only view

## Rate Limits

- 25 shares per hour per IP
- No authentication required
- No API key needed
