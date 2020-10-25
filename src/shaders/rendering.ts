import { FLOOR_ORIGIN, PARTICLE_OPACITY_SCALE } from '../shared'
import glsl from 'glslify'

const vertex = glsl`
precision highp float;

attribute vec2 a_textureCoordinates;

varying vec3 v_position;

varying float v_opacity;

uniform sampler2D u_particleTexture;

uniform sampler2D u_opacityTexture;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

uniform mat4 u_lightViewProjectionMatrix;

uniform float u_particleDiameter;
uniform float u_screenWidth;

void main () {
vec3 position = texture2D(u_particleTexture, a_textureCoordinates).rgb;
v_position = position;

vec2 lightTextureCoordinates = vec2(u_lightViewProjectionMatrix * vec4(position, 1.0)) * 0.5 + 0.5;
v_opacity = texture2D(u_opacityTexture, lightTextureCoordinates).a;

vec3 viewSpacePosition = vec3(u_viewMatrix * vec4(position, 1.0));
vec4 corner = vec4(u_particleDiameter * 0.5, u_particleDiameter * 0.5, viewSpacePosition.z, 1.0);
float projectedCornerX = dot(vec4(u_projectionMatrix[0][0], u_projectionMatrix[1][0], u_projectionMatrix[2][0], u_projectionMatrix[3][0]), corner);
float projectedCornerW = dot(vec4(u_projectionMatrix[0][3], u_projectionMatrix[1][3], u_projectionMatrix[2][3], u_projectionMatrix[3][3]), corner);
gl_PointSize = u_screenWidth * 0.5 * projectedCornerX * 2.0 / projectedCornerW;

gl_Position = u_projectionMatrix * vec4(viewSpacePosition, 1.0);

if (position.y < 
  ${FLOOR_ORIGIN[1].toFixed(8)}
  ) gl_Position = vec4(9999999.0, 9999999.0, 9999999.0, 1.0);
}
` as string

const fragment = glsl`
precision highp float;

varying vec3 v_position;
varying float v_opacity;

uniform float u_particleAlpha;

uniform vec3 u_particleColor;

uniform bool u_flipped; //non-flipped is front-to-back, flipped is back-to-front

void main () {
  float distanceFromCenter = distance(gl_PointCoord.xy, vec2(0.5, 0.5));
  if (distanceFromCenter > 0.5) discard;
  float alpha = clamp(1.0 - distanceFromCenter * 2.0, 0.0, 1.0) * u_particleAlpha;

  vec3 color = (1.0 - v_opacity * ${PARTICLE_OPACITY_SCALE.toFixed(
    8
  )}) * u_particleColor;

  gl_FragColor = vec4(color * alpha, alpha);
}` as string

export default { vertex, fragment }
