# WebGL Demo and Test Application

This directory contains a WebGL test server for testing the MCP WebGL debugger.

## Quick Start

1. Start the test server:
```bash
cd demo
bun run server.ts
```

2. In another terminal, launch the debug browser:
```bash
bun .claude/tmp/launch-debug-browser.ts
```

This will automatically open the WebGL test application at http://localhost:8765/webgl-test/

## Available Test Pages

- `/webgl-test/` - Home page with WebGL support check
- `/webgl-test/basic` - Basic WebGL 1.0 green triangle
- `/webgl-test/webgl2` - WebGL 2.0 orange square
- `/webgl-test/texture` - Texture loading test with checkerboard pattern
- `/webgl-test/error` - WebGL error testing with intentional errors

## Test Server

The server uses Hono framework and provides:
- Static file serving for the WebGL test application
- CORS support for cross-origin testing
- Default port 8765 (configurable via PORT environment variable)

## Integration with MCP

Once the browser is launched with the debug CLI, you can connect to it from the MCP server:

```javascript
// Connect to the debug browser
browser_connect({
  instanceId: "debug-browser",
  debugPort: 9222
})

// Inject WebGL debugging
webgl_inject_debugging({ 
  instanceId: "debug-browser" 
})

// Capture a screenshot
screenshot_capture({
  instanceId: "debug-browser",
  testCase: "webgl-test"
})

// Get WebGL errors
webgl_get_errors({})
```