import glsl from 'glslify'
const vertex = glsl`
precision highp float;

attribute vec3 a_vertexPosition;

varying vec3 v_position;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

void main () {
v_position = a_vertexPosition;
gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_vertexPosition, 1.0);
}` as string

const fragment = glsl`
precision highp float;

varying vec3 v_position;

uniform sampler2D u_opacityTexture;

uniform mat4 u_lightViewProjectionMatrix;

void main () {
vec2 lightTextureCoordinates = vec2(u_lightViewProjectionMatrix * vec4(v_position, 1.0)) * 0.5 + 0.5;
float opacity = texture2D(u_opacityTexture, lightTextureCoordinates).a;

if (lightTextureCoordinates.x < 0.0 || lightTextureCoordinates.x > 1.0 || lightTextureCoordinates.y < 0.0 || lightTextureCoordinates.y > 1.0) {
opacity = 0.0;
}

gl_FragColor = vec4(0.0, 0.0, 0.0, opacity * 0.5);
}` as string
export default {
  vertex,
  fragment,
}
