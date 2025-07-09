import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// Enable CORS
app.use("*", cors());

// Simple HTML template
const createTestPage = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title} - WebGL Test</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            color: #fff;
        }
        canvas {
            border: 1px solid #444;
            display: block;
            margin: 20px auto;
        }
        h1 { text-align: center; }
        .info {
            text-align: center;
            margin: 20px;
            padding: 10px;
            background: #2a2a2a;
            border-radius: 8px;
        }
        .nav {
            text-align: center;
            margin: 20px;
        }
        .nav a {
            color: #4CAF50;
            text-decoration: none;
            margin: 0 10px;
        }
        .nav a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="nav">
        <a href="/webgl-test/">Home</a>
        <a href="/webgl-test/basic">Basic Triangle</a>
        <a href="/webgl-test/webgl2">WebGL2 Square</a>
        <a href="/webgl-test/texture">Texture Test</a>
        <a href="/webgl-test/error">Error Test</a>
    </div>
    ${content}
</body>
</html>
`;

// Home page
app.get("/webgl-test/", (c) => {
  const content = `
    <div class="info">
        <h2>WebGL Feature Detection</h2>
        <p>Checking WebGL capabilities and extensions...</p>
    </div>
    <table id="feature-table" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
        <thead>
            <tr style="background: #333;">
                <th style="padding: 10px; text-align: left; border: 1px solid #555;">Feature</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #555;">Status</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #555;">Details</th>
            </tr>
        </thead>
        <tbody id="feature-body" style="background: #2a2a2a;">
        </tbody>
    </table>
    <script>
        const tbody = document.getElementById('feature-body');
        const features = [];
        
        // Test WebGL 1.0
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        // Test WebGL 2.0
        const gl2 = canvas.getContext('webgl2');
        
        // Basic WebGL support
        features.push({
            name: 'WebGL 1.0',
            status: !!gl,
            details: gl ? gl.getParameter(gl.VERSION) : 'Not supported'
        });
        
        features.push({
            name: 'WebGL 2.0',
            status: !!gl2,
            details: gl2 ? gl2.getParameter(gl2.VERSION) : 'Not supported'
        });
        
        if (gl) {
            // Renderer info
            features.push({
                name: 'GPU Vendor',
                status: true,
                details: gl.getParameter(gl.VENDOR)
            });
            
            features.push({
                name: 'GPU Renderer',
                status: true,
                details: gl.getParameter(gl.RENDERER)
            });
            
            features.push({
                name: 'Shading Language',
                status: true,
                details: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
            });
            
            // Capabilities
            features.push({
                name: 'Max Texture Size',
                status: true,
                details: gl.getParameter(gl.MAX_TEXTURE_SIZE) + ' pixels'
            });
            
            features.push({
                name: 'Max Vertex Attributes',
                status: true,
                details: gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
            });
            
            features.push({
                name: 'Max Texture Units',
                status: true,
                details: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
            });
            
            features.push({
                name: 'Max Renderbuffer Size',
                status: true,
                details: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) + ' pixels'
            });
            
            features.push({
                name: 'Max Viewport Dimensions',
                status: true,
                details: gl.getParameter(gl.MAX_VIEWPORT_DIMS).join(' x ')
            });
            
            // Extensions
            const extensions = gl.getSupportedExtensions() || [];
            const importantExtensions = [
                'OES_texture_float',
                'OES_texture_float_linear',
                'OES_texture_half_float',
                'OES_texture_half_float_linear',
                'WEBGL_depth_texture',
                'WEBGL_compressed_texture_s3tc',
                'WEBGL_compressed_texture_pvrtc',
                'WEBGL_compressed_texture_etc1',
                'ANGLE_instanced_arrays',
                'OES_element_index_uint',
                'EXT_blend_minmax',
                'EXT_frag_depth',
                'WEBGL_draw_buffers',
                'OES_vertex_array_object',
                'WEBGL_lose_context',
                'WEBGL_debug_renderer_info',
                'WEBGL_debug_shaders'
            ];
            
            importantExtensions.forEach(ext => {
                features.push({
                    name: 'Extension: ' + ext,
                    status: extensions.includes(ext),
                    details: extensions.includes(ext) ? 'Available' : 'Not available'
                });
            });
        }
        
        // WebGL 2.0 specific features
        if (gl2) {
            features.push({
                name: 'WebGL2: Transform Feedback',
                status: true,
                details: 'Supported'
            });
            
            features.push({
                name: 'WebGL2: Uniform Buffer Objects',
                status: true,
                details: 'Supported'
            });
            
            features.push({
                name: 'WebGL2: 3D Textures',
                status: true,
                details: 'Supported'
            });
            
            features.push({
                name: 'WebGL2: Sampler Objects',
                status: true,
                details: 'Supported'
            });
        }
        
        // WebGPU check
        features.push({
            name: 'WebGPU (Experimental)',
            status: 'gpu' in navigator,
            details: 'gpu' in navigator ? 'API available' : 'Not available'
        });
        
        // Render table
        features.forEach(feature => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #444';
            
            const nameCell = document.createElement('td');
            nameCell.style.padding = '8px';
            nameCell.style.borderRight = '1px solid #444';
            nameCell.textContent = feature.name;
            
            const statusCell = document.createElement('td');
            statusCell.style.padding = '8px';
            statusCell.style.textAlign = 'center';
            statusCell.style.borderRight = '1px solid #444';
            if (feature.status === true) {
                statusCell.innerHTML = '<span style="color: #4CAF50;">✓</span>';
            } else if (feature.status === false) {
                statusCell.innerHTML = '<span style="color: #f44336;">✗</span>';
            } else {
                statusCell.innerHTML = '<span style="color: #ff9800;">?</span>';
            }
            
            const detailsCell = document.createElement('td');
            detailsCell.style.padding = '8px';
            detailsCell.style.fontSize = '0.9em';
            detailsCell.style.color = '#ccc';
            detailsCell.textContent = feature.details;
            
            row.appendChild(nameCell);
            row.appendChild(statusCell);
            row.appendChild(detailsCell);
            tbody.appendChild(row);
        });
        
        // Update info
        const info = document.querySelector('.info p');
        info.textContent = 'Found ' + features.filter(f => f.status === true).length + ' supported features out of ' + features.length + ' tested';
    </script>
  `;
  return c.html(createTestPage("WebGL Feature Detection", content));
});

// Basic WebGL triangle
app.get("/webgl-test/basic", (c) => {
  const content = `
    <div class="info">
        <p>Basic WebGL 1.0 - Green Triangle</p>
    </div>
    <canvas id="canvas" width="600" height="400"></canvas>
    <script>
        const canvas = document.getElementById('canvas');
        const gl = canvas.getContext('webgl');
        
        if (!gl) {
            alert('WebGL not supported');
        } else {
            // Vertex shader
            const vsSource = \`
                attribute vec2 a_position;
                void main() {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }
            \`;
            
            // Fragment shader
            const fsSource = \`
                precision mediump float;
                void main() {
                    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
                }
            \`;
            
            // Compile shaders
            const vs = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vs, vsSource);
            gl.compileShader(vs);
            
            const fs = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fs, fsSource);
            gl.compileShader(fs);
            
            // Create program
            const program = gl.createProgram();
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);
            
            // Triangle vertices
            const vertices = new Float32Array([
                0.0,  0.5,
               -0.5, -0.5,
                0.5, -0.5
            ]);
            
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            
            const positionLocation = gl.getAttribLocation(program, 'a_position');
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            
            // Clear and draw
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            gl.useProgram(program);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
    </script>
  `;
  return c.html(createTestPage("Basic WebGL", content));
});

// WebGL2 test
app.get("/webgl-test/webgl2", (c) => {
  const content = `
    <div class="info">
        <p>WebGL 2.0 - Orange Square</p>
    </div>
    <canvas id="canvas" width="600" height="400"></canvas>
    <script>
        const canvas = document.getElementById('canvas');
        const gl = canvas.getContext('webgl2');
        
        if (!gl) {
            alert('WebGL2 not supported');
        } else {
            // Vertex shader
            const vsSource = \`#version 300 es
                in vec2 a_position;
                void main() {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }
            \`;
            
            // Fragment shader
            const fsSource = \`#version 300 es
                precision mediump float;
                out vec4 outColor;
                void main() {
                    outColor = vec4(1.0, 0.5, 0.0, 1.0);
                }
            \`;
            
            // Compile shaders
            const vs = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vs, vsSource);
            gl.compileShader(vs);
            
            const fs = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fs, fsSource);
            gl.compileShader(fs);
            
            // Create program
            const program = gl.createProgram();
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);
            
            // Square vertices
            const vertices = new Float32Array([
                -0.5,  0.5,
                -0.5, -0.5,
                 0.5,  0.5,
                 0.5, -0.5
            ]);
            
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            
            const positionLocation = gl.getAttribLocation(program, 'a_position');
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            
            // Clear and draw
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            gl.useProgram(program);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
    </script>
  `;
  return c.html(createTestPage("WebGL2 Test", content));
});

// Texture test
app.get("/webgl-test/texture", (c) => {
  const content = `
    <div class="info">
        <p>Texture Loading Test - Checkerboard Pattern</p>
    </div>
    <canvas id="canvas" width="600" height="400"></canvas>
    <script>
        const canvas = document.getElementById('canvas');
        const gl = canvas.getContext('webgl');
        
        if (!gl) {
            alert('WebGL not supported');
        } else {
            // Create a simple checkerboard texture
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            
            const pixels = new Uint8Array([
                255, 0, 0, 255,    // Red
                0, 255, 0, 255,    // Green
                0, 0, 255, 255,    // Blue
                255, 255, 0, 255   // Yellow
            ]);
            
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            
            // Clear to show texture was created
            gl.clearColor(0.2, 0.2, 0.2, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            // Display info
            const info = document.querySelector('.info');
            info.innerHTML += '<p style="color: #4CAF50;">✓ 2x2 texture created successfully</p>';
        }
    </script>
  `;
  return c.html(createTestPage("Texture Test", content));
});

// Error test
app.get("/webgl-test/error", (c) => {
  const content = `
    <div class="info">
        <p>WebGL Error Test - Intentional Errors</p>
        <div id="errors" style="text-align: left; font-family: monospace; background: #333; padding: 10px; margin: 10px; border-radius: 4px;"></div>
    </div>
    <canvas id="canvas" width="600" height="400"></canvas>
    <script>
        const canvas = document.getElementById('canvas');
        const gl = canvas.getContext('webgl');
        const errors = document.getElementById('errors');
        
        function logError(msg) {
            errors.innerHTML += '<div style="color: #f44336;">• ' + msg + '</div>';
        }
        
        function getErrorString(error) {
            switch(error) {
                case gl.NO_ERROR: return 'NO_ERROR';
                case gl.INVALID_ENUM: return 'INVALID_ENUM';
                case gl.INVALID_VALUE: return 'INVALID_VALUE';
                case gl.INVALID_OPERATION: return 'INVALID_OPERATION';
                case gl.INVALID_FRAMEBUFFER_OPERATION: return 'INVALID_FRAMEBUFFER_OPERATION';
                case gl.OUT_OF_MEMORY: return 'OUT_OF_MEMORY';
                default: return 'Unknown error';
            }
        }
        
        if (!gl) {
            logError('WebGL not supported');
        } else {
            gl.clearColor(0.1, 0.1, 0.1, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            // Test 1: Invalid enum
            try {
                gl.enable(999999);
                const error = gl.getError();
                if (error !== gl.NO_ERROR) {
                    logError('Test 1 - Invalid enum: ' + getErrorString(error));
                }
            } catch (e) {
                logError('Test 1 exception: ' + e.message);
            }
            
            // Test 2: Invalid shader
            try {
                const shader = gl.createShader(gl.VERTEX_SHADER);
                gl.shaderSource(shader, 'invalid shader code');
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    logError('Test 2 - Shader compilation failed: ' + gl.getShaderInfoLog(shader));
                }
            } catch (e) {
                logError('Test 2 exception: ' + e.message);
            }
            
            // Test 3: Invalid buffer binding
            try {
                gl.bindBuffer(gl.ARRAY_BUFFER, 'not-a-buffer');
            } catch (e) {
                logError('Test 3 - Invalid buffer: ' + e.message);
            }
            
            errors.innerHTML += '<div style="color: #4CAF50; margin-top: 10px;">✓ Error tests completed</div>';
        }
    </script>
  `;
  return c.html(createTestPage("Error Test", content));
});

// Redirect root to webgl-test
app.get("/", (c) => {
  return c.redirect("/webgl-test/");
});

// Redirect /webgl-test to /webgl-test/
app.get("/webgl-test", (c) => {
  return c.redirect("/webgl-test/");
});

// 404 handler
app.notFound((c) => {
  return c.text("404 Not Found", 404);
});

const port = parseInt(process.env.PORT || "8765");

console.log(`🚀 WebGL Test Server running at http://localhost:${port}/webgl-test/`);
console.log(`\nAvailable tests:`);
console.log(`  - http://localhost:${port}/webgl-test/       (Home)`);
console.log(`  - http://localhost:${port}/webgl-test/basic  (Basic Triangle)`);
console.log(`  - http://localhost:${port}/webgl-test/webgl2 (WebGL2 Square)`);
console.log(`  - http://localhost:${port}/webgl-test/texture (Texture Test)`);
console.log(`  - http://localhost:${port}/webgl-test/error  (Error Test)`);
console.log(`\nPress Ctrl+C to stop the server`);

export default {
  port,
  fetch: app.fetch,
};