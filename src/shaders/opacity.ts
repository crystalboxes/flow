import glsl from 'glslify'

const vertex = glsl`  
precision highp float;

attribute vec2 a_textureCoordinates;

uniform sampler2D u_particleTexture;

uniform mat4 u_lightViewMatrix;
uniform mat4 u_lightProjectionMatrix;

uniform float u_particleDiameter;
uniform float u_screenWidth;

void main () {
  vec3 position = texture2D(u_particleTexture, a_textureCoordinates).rgb;

  vec3 viewSpacePosition = vec3(u_lightViewMatrix * vec4(position, 1.0));

  vec4 corner = vec4(u_particleDiameter * 0.5, u_particleDiameter * 0.5, viewSpacePosition.z, 1.0);

  float projectedCornerX = dot(vec4(u_lightProjectionMatrix[0][0], u_lightProjectionMatrix[1][0], u_lightProjectionMatrix[2][0], u_lightProjectionMatrix[3][0]), corner);
  float projectedCornerW = dot(vec4(u_lightProjectionMatrix[0][3], u_lightProjectionMatrix[1][3], u_lightProjectionMatrix[2][3], u_lightProjectionMatrix[3][3]), corner);

  gl_PointSize = u_screenWidth * 0.5 * projectedCornerX * 2.0 / projectedCornerW;

  gl_Position = u_lightProjectionMatrix * vec4(viewSpacePosition, 1.0);
}` as string

const fragment = glsl`
precision highp float;

uniform float u_particleAlpha;

void main () {
  float distanceFromCenter = distance(gl_PointCoord.xy, vec2(0.5, 0.5));
  if (distanceFromCenter > 0.5) discard;
  float alpha = clamp(1.0 - distanceFromCenter * 2.0, 0.0, 1.0) * u_particleAlpha;

  gl_FragColor = vec4(1.0, 1.0, 1.0, alpha); //under operator requires this premultiplication
}` as string

export default {
  vertex,
  fragment,
}
