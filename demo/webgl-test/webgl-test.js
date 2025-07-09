// WebGL Test Application
let gl = null;
let gl2 = null;
let currentProgram = null;
const errors = [];

// Initialize WebGL status check
function checkWebGLSupport() {
    const canvas = document.getElementById('canvas');
    const statusDiv = document.getElementById('webgl-status');
    
    // Check WebGL 1 support
    try {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            statusDiv.innerHTML += '<span class="status success">WebGL 1.0 Supported</span>';
        } else {
            statusDiv.innerHTML += '<span class="status error">WebGL 1.0 Not Supported</span>';
        }
    } catch (e) {
        statusDiv.innerHTML += '<span class="status error">WebGL 1.0 Error: ' + e.message + '</span>';
    }
    
    // Check WebGL 2 support
    try {
        gl2 = canvas.getContext('webgl2');
        if (gl2) {
            statusDiv.innerHTML += '<span class="status success">WebGL 2.0 Supported</span>';
        } else {
            statusDiv.innerHTML += '<span class="status warning">WebGL 2.0 Not Supported</span>';
        }
    } catch (e) {
        statusDiv.innerHTML += '<span class="status error">WebGL 2.0 Error: ' + e.message + '</span>';
    }
    
    // Display context info
    displayContextInfo();
}

// Display WebGL context information
function displayContextInfo() {
    const contextInfo = document.getElementById('context-info');
    const context = gl2 || gl;
    
    if (!context) {
        contextInfo.innerHTML = '<p>No WebGL context available</p>';
        return;
    }
    
    const info = {
        'Version': context.getParameter(context.VERSION),
        'Vendor': context.getParameter(context.VENDOR),
        'Renderer': context.getParameter(context.RENDERER),
        'Shading Language Version': context.getParameter(context.SHADING_LANGUAGE_VERSION),
        'Max Texture Size': context.getParameter(context.MAX_TEXTURE_SIZE),
        'Max Vertex Attributes': context.getParameter(context.MAX_VERTEX_ATTRIBS),
        'Max Texture Image Units': context.getParameter(context.MAX_TEXTURE_IMAGE_UNITS),
        'Max Renderbuffer Size': context.getParameter(context.MAX_RENDERBUFFER_SIZE),
        'Max Viewport Dims': context.getParameter(context.MAX_VIEWPORT_DIMS),
    };
    
    let html = '';
    for (const [key, value] of Object.entries(info)) {
        html += `<div class="info-row"><span class="info-label">${key}:</span> ${value}</div>`;
    }
    
    contextInfo.innerHTML = html;
}

// Test basic WebGL rendering
function testBasicWebGL() {
    const canvas = document.getElementById('canvas');
    const context = gl || canvas.getContext('webgl');
    
    if (!context) {
        logError('WebGL context not available');
        return;
    }
    
    // Clear with a color
    context.clearColor(0.2, 0.3, 0.4, 1.0);
    context.clear(context.COLOR_BUFFER_BIT);
    
    // Create a simple triangle
    const vertexShaderSource = `
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;
    
    const fragmentShaderSource = `
        precision mediump float;
        void main() {
            gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
        }
    `;
    
    try {
        const program = createShaderProgram(context, vertexShaderSource, fragmentShaderSource);
        
        // Create triangle vertices
        const vertices = new Float32Array([
            0.0,  0.5,
           -0.5, -0.5,
            0.5, -0.5
        ]);
        
        const buffer = context.createBuffer();
        context.bindBuffer(context.ARRAY_BUFFER, buffer);
        context.bufferData(context.ARRAY_BUFFER, vertices, context.STATIC_DRAW);
        
        const positionLocation = context.getAttribLocation(program, 'a_position');
        context.enableVertexAttribArray(positionLocation);
        context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0);
        
        context.useProgram(program);
        context.drawArrays(context.TRIANGLES, 0, 3);
        
        logSuccess('Basic WebGL test completed - Green triangle rendered');
    } catch (e) {
        logError('Basic WebGL test failed: ' + e.message);
    }
}

// Test WebGL 2.0 features
function testWebGL2() {
    const canvas = document.getElementById('canvas');
    const context = gl2 || canvas.getContext('webgl2');
    
    if (!context) {
        logError('WebGL 2.0 context not available');
        return;
    }
    
    // Clear with a different color
    context.clearColor(0.4, 0.2, 0.3, 1.0);
    context.clear(context.COLOR_BUFFER_BIT);
    
    // WebGL 2.0 specific shader
    const vertexShaderSource = `#version 300 es
        in vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;
    
    const fragmentShaderSource = `#version 300 es
        precision mediump float;
        out vec4 outColor;
        void main() {
            outColor = vec4(1.0, 0.5, 0.0, 1.0);
        }
    `;
    
    try {
        const program = createShaderProgram(context, vertexShaderSource, fragmentShaderSource);
        
        // Create square vertices using WebGL 2.0 features
        const vertices = new Float32Array([
            -0.5,  0.5,
            -0.5, -0.5,
             0.5,  0.5,
             0.5, -0.5
        ]);
        
        // Use Vertex Array Object (WebGL 2.0 feature)
        const vao = context.createVertexArray();
        context.bindVertexArray(vao);
        
        const buffer = context.createBuffer();
        context.bindBuffer(context.ARRAY_BUFFER, buffer);
        context.bufferData(context.ARRAY_BUFFER, vertices, context.STATIC_DRAW);
        
        const positionLocation = context.getAttribLocation(program, 'a_position');
        context.enableVertexAttribArray(positionLocation);
        context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0);
        
        context.useProgram(program);
        context.drawArrays(context.TRIANGLE_STRIP, 0, 4);
        
        logSuccess('WebGL 2.0 test completed - Orange square rendered');
    } catch (e) {
        logError('WebGL 2.0 test failed: ' + e.message);
    }
}

// Test shader compilation with error
function testShaderCompilation() {
    const context = gl2 || gl;
    if (!context) {
        logError('No WebGL context available');
        return;
    }
    
    // Intentionally broken shader
    const brokenVertexShader = `
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0) // Missing semicolon
        }
    `;
    
    try {
        const shader = context.createShader(context.VERTEX_SHADER);
        context.shaderSource(shader, brokenVertexShader);
        context.compileShader(shader);
        
        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
            const info = context.getShaderInfoLog(shader);
            logError('Shader compilation error (expected): ' + info);
        } else {
            logSuccess('Shader compiled successfully (unexpected)');
        }
    } catch (e) {
        logError('Shader test error: ' + e.message);
    }
}

// Test texture loading
function testTextureLoading() {
    const context = gl2 || gl;
    if (!context) {
        logError('No WebGL context available');
        return;
    }
    
    try {
        const texture = context.createTexture();
        context.bindTexture(context.TEXTURE_2D, texture);
        
        // Create a 2x2 texture
        const pixels = new Uint8Array([
            255, 0, 0, 255,    // Red
            0, 255, 0, 255,    // Green
            0, 0, 255, 255,    // Blue
            255, 255, 0, 255   // Yellow
        ]);
        
        context.texImage2D(
            context.TEXTURE_2D,
            0,
            context.RGBA,
            2,
            2,
            0,
            context.RGBA,
            context.UNSIGNED_BYTE,
            pixels
        );
        
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
        
        logSuccess('Texture loaded successfully - 2x2 RGBA texture created');
    } catch (e) {
        logError('Texture loading failed: ' + e.message);
    }
}

// Intentionally cause a WebGL error
function causeWebGLError() {
    const context = gl2 || gl;
    if (!context) {
        logError('No WebGL context available');
        return;
    }
    
    try {
        // Try to bind an invalid buffer
        context.bindBuffer(context.ARRAY_BUFFER, 'invalid-buffer');
        
        // Check for error
        const error = context.getError();
        if (error !== context.NO_ERROR) {
            logError('WebGL error triggered: ' + getWebGLErrorString(context, error));
        }
    } catch (e) {
        logError('Error test failed: ' + e.message);
    }
}

// Helper functions
function createShaderProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
    }
    
    return program;
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(shader));
    }
    
    return shader;
}

function getWebGLErrorString(gl, error) {
    switch (error) {
        case gl.NO_ERROR: return 'NO_ERROR';
        case gl.INVALID_ENUM: return 'INVALID_ENUM';
        case gl.INVALID_VALUE: return 'INVALID_VALUE';
        case gl.INVALID_OPERATION: return 'INVALID_OPERATION';
        case gl.INVALID_FRAMEBUFFER_OPERATION: return 'INVALID_FRAMEBUFFER_OPERATION';
        case gl.OUT_OF_MEMORY: return 'OUT_OF_MEMORY';
        default: return 'Unknown error';
    }
}

function logError(message) {
    const timestamp = new Date().toLocaleTimeString();
    errors.push({ message, timestamp });
    updateErrorLog();
    console.error(message);
}

function logSuccess(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(message);
}

function updateErrorLog() {
    const errorDiv = document.getElementById('errors');
    errorDiv.innerHTML = errors.map(e => 
        `<div class="error-entry">[${e.timestamp}] ${e.message}</div>`
    ).join('');
}

function clearErrors() {
    errors.length = 0;
    updateErrorLog();
}

// Initialize on page load
window.onload = () => {
    checkWebGLSupport();
};