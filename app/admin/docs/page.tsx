'use client'

import { useEffect, useState, useRef } from 'react'

export default function DocsPage() {
  const [spec, setSpec] = useState<string>('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Load swagger-ui from CDN inside an iframe
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Brook API Docs</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" >
  <style>
    body { margin: 0; }
    .swagger-ui .info { margin-bottom: 20px; }
    .swagger-ui .scheme-container { padding: 15px 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs',
      dom_id: '#swagger-ui',
      deepLinking: true,
      filter: true,
      defaultModelsExpandDepth: 1,
      displayRequestDuration: true,
      tryItOutEnabled: true,
    })
  </script>
</body>
</html>`
    setSpec(html)
  }, [])

  if (!spec) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--color-mute)' }}>Loading API documentation…</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p className="mono-eyebrow" style={{ color: 'var(--color-mute)', marginBottom: 4 }}>
          Developer
        </p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-1px',
            color: 'var(--color-ink)',
          }}
        >
          API Documentation
        </h1>
        <p style={{ color: 'var(--color-mute)', fontSize: 14, marginTop: 6 }}>
          Interactive API reference powered by Swagger UI. OpenAPI spec available at{' '}
          <a href="/api/docs" target="_blank" style={{ color: 'var(--color-link)' }}>/api/docs</a>.
        </p>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--rounded-md)',
          overflow: 'hidden',
        }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={spec}
          style={{
            width: '100%',
            height: 'calc(100vh - 180px)',
            border: 'none',
          }}
          title="Swagger UI"
        />
      </div>
    </div>
  )
}
