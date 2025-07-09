precision mediump float;

uniform vec3 uColor;
// Intentional error: using undefined variable
uniform sampler2D uTexture;

void main() {
    // Error: textureColor is not defined
    vec4 color = texture2D(uTexture, textureCoord);
    gl_FragColor = vec4(uColor, 1.0) * color;
}