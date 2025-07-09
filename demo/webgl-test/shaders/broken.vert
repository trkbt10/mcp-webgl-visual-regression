attribute vec3 aPosition;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
    // Intentional syntax error: missing semicolon
    vec4 position = vec4(aPosition, 1.0)
    gl_Position = uProjectionMatrix * uModelViewMatrix * position;
}