---
layout: default
title: API Reference
---

REST API for programmatic access to Deliberate Lab experiment management.

## Authentication

All API requests require an API key in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

### Creating an API Key

1. Log into the Deliberate Lab web interface
2. Navigate to **Settings** (top right menu)
3. Scroll to the **API Keys** section
4. Click **Create New API Key**
5. Enter a descriptive name for your key
6. Copy the generated key immediately - it will only be shown once

**Important:** Store your API key securely. You cannot retrieve it after closing the creation dialog.

### Managing API Keys

In the Settings page API Keys section, you can:
- View all your API keys
- See when each key was created and last used
- Revoke keys you no longer need

## Rate Limiting

- **Limit:** 100 requests per 15-minute window per API key
- **Response:** HTTP 429 when exceeded

## Python Client

A Python client with fully-typed Pydantic models is available:

```bash
pip install git+https://github.com/PAIR-code/deliberate-lab.git#subdirectory=scripts
```

```python
import deliberate_lab as dl

client = dl.Client()  # Uses DL_API_KEY environment variable
experiments = client.list_experiments()
data = client.export_experiment("experiment-id")
```

## API Reference

<div id="swagger-ui"></div>
<link
  rel="stylesheet"
  type="text/css"
  href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
/>
<style>
  /* Override Jekyll default styles for Swagger UI */
  .content-wrapper {
    max-width: 100%;
  }

  #swagger-ui code {
    all: revert !important;
  }
</style>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
<script>
  window.onload = function () {
    const ui = SwaggerUIBundle({
      url: '{{ site.baseurl }}/assets/api/openapi.yaml',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 0,
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
    });

    window.ui = ui;
  };
</script>
