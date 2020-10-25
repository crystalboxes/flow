import glsl from 'glslify'
const vertex = glsl`
precision highp float;

attribute vec2 a_position;
varying vec2 v_coordinates;

void main () {
v_coordinates = a_position.xy * 0.5 + 0.5;
gl_Position = vec4(a_position, 0.0, 1.0);
}`

const fragment = glsl`
precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_particleTexture;
uniform sampler2D u_offsetTexture;

uniform float u_offsetScale;

void main () {
  vec4 data = texture2D(u_particleTexture, v_coordinates);
  vec4 offset = texture2D(u_offsetTexture, v_coordinates);
  vec3 position = data.rgb + offset.rgb * u_offsetScale;
  gl_FragColor = vec4(position, data.a);
}`

export default {
  vertex,
  fragment,
}
