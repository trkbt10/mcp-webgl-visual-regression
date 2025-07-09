# mcp-webgl-visual-regression

MCP server for WebGL visual regression testing with automated screenshot comparison.

## Overview

This tool provides WebGL regression testing capabilities via the Model Context Protocol (MCP). It automates browser-based visual regression testing by capturing and comparing screenshots of WebGL applications across different test runs. Error detection and monitoring features are included to help diagnose test failures.

## Features

### Core Regression Testing
- Automated screenshot capture of WebGL applications
- Pixel-by-pixel comparison with baseline images
- Support for full page, canvas-only, or element-specific captures
- Test case organization and baseline management

### Supporting Features
- Browser automation via Puppeteer with WebGL optimization
- WebGL error detection to identify rendering issues
- Shader compilation error tracking for debugging test failures
- File watching for development workflows

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-webgl-visual-regression.git
cd mcp-webgl-visual-regression

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### As MCP Server

```bash
# Start the MCP server
npm run start:mcp
```

### Available MCP Tools

#### Regression Testing (Primary)
- `screenshot_capture` - Capture baseline or test screenshots
  - Options: full page, canvas only, or specific element
  - Organized by test case names
- `screenshot_compare` - Compare screenshots for visual differences
  - Configurable difference threshold
  - Returns difference percentage and diff image
- `screenshot_list` - List all captured screenshots by test case

#### Browser Control
- `browser_launch` - Launch a browser instance optimized for WebGL
- `browser_navigate` - Navigate to test URLs
- `browser_execute` - Execute test setup scripts
- `browser_close` - Clean up browser instances

#### Debugging Support
- `webgl_inject_debugging` - Enable error tracking for test debugging
- `webgl_get_errors` - Retrieve WebGL errors that occurred during tests
- `webgl_get_shader_errors` - Get shader compilation failures
- `webgl_get_error_summary` - View aggregated error statistics

### Typical Regression Test Workflow

1. **Capture Baseline**
   ```javascript
   // Launch browser
   browser_launch({ instanceId: "test-1" })
   
   // Navigate to your WebGL app
   browser_navigate({ instanceId: "test-1", url: "http://localhost:3000" })
   
   // Capture baseline screenshot
   screenshot_capture({ 
     instanceId: "test-1", 
     testCase: "spinning-cube",
     captureCanvas: true 
   })
   ```

2. **Run Regression Test**
   ```javascript
   // After code changes, capture new screenshot
   screenshot_capture({ 
     instanceId: "test-1", 
     testCase: "spinning-cube-updated",
     captureCanvas: true 
   })
   
   // Compare with baseline
   screenshot_compare({
     baseline: "spinning-cube",
     current: "spinning-cube-updated",
     threshold: 0.1  // 0.1% difference threshold
   })
   ```

3. **Debug Failures**
   If visual differences are detected, use error tracking to diagnose:
   ```javascript
   webgl_inject_debugging({ instanceId: "test-1" })
   // Re-run the test
   webgl_get_error_summary({ includeShaderErrors: true })
   ```

## Configuration

### Screenshot Storage

Screenshots are stored in:
- Baseline: `screenshots/baseline/{testCase}/`
- Current: `screenshots/current/{testCase}/`
- Diffs: `screenshots/diff/{testCase}/`

### Error Detection (Optional)

When debugging test failures with `webgl_inject_debugging`:
- `collectionDuration`: Error collection period in seconds (default: 10)
- `maxErrors`: Maximum errors before stopping collection (default: 1000)

## Development

```bash
# Run tests
npm test

# Type checking
npm run typecheck

# Format code
npm run format

# Development mode (with watch)
npm run dev

# Clean build artifacts
npm run clean
```

## Project Structure

```
src/
├── server.ts           # MCP server implementation
├── browser/            # Browser automation
├── debugger/           # WebGL error tracking
├── screenshot/         # Screenshot functionality
└── tools/              # MCP tool implementations
```

## Requirements

- Node.js 18+
- npm or yarn
- Chrome/Chromium browser

## License

This project is released into the public domain under the Unlicense. See the LICENSE file for details.