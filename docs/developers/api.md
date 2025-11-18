---
layout: default
---

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
    const spec = {{ site.data.openapi | jsonify }};

    const ui = SwaggerUIBundle({
      spec: spec,
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
    });

    window.ui = ui;
  };
</script>
