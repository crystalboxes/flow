import {
  NOISE_OCTAVES,
  NOISE_POSITION_SCALE,
  NOISE_TIME_SCALE,
  NOISE_SCALE,
  BASE_SPEED,
  FLOOR_ORIGIN,
  PARTICLE_OPACITY_SCALE,
  BACKGROUND_DISTANCE_SCALE,
} from '../shared'
import glsl from 'glslify'

export var SIMULATION_VERTEX_SHADER_SOURCE = glsl`
precision highp float;

attribute vec2 a_position;

void main () {
gl_Position = vec4(a_position, 0.0, 1.0);
}`

export var SIMULATION_FRAGMENT_SHADER_SOURCE = glsl`
precision highp float;

uniform sampler2D u_particleTexture;
uniform sampler2D u_spawnTexture;

uniform vec2 u_resolution;

uniform float u_deltaTime;
uniform float u_time;

uniform float u_persistence;

const int OCTAVES = ${NOISE_OCTAVES.toFixed(0)};

vec4 mod289(vec4 x) {
return x - floor(x * (1.0 / 289.0)) * 289.0;
}

float mod289(float x) {
return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
return mod289(((x*34.0)+1.0)*x);
}

float permute(float x) {
return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt(float r) {
return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4(float j, vec4 ip) {
const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
vec4 p,s;

p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
s = vec4(lessThan(p, vec4(0.0)));
p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 

return p;
}

#define F4 0.309016994374947451

vec4 simplexNoiseDerivatives (vec4 v) {
const vec4  C = vec4( 0.138196601125011,0.276393202250021,0.414589803375032,-0.447213595499958);

vec4 i  = floor(v + dot(v, vec4(F4)) );
vec4 x0 = v -   i + dot(i, C.xxxx);

vec4 i0;
vec3 isX = step( x0.yzw, x0.xxx );
vec3 isYZ = step( x0.zww, x0.yyz );
i0.x = isX.x + isX.y + isX.z;
i0.yzw = 1.0 - isX;
i0.y += isYZ.x + isYZ.y;
i0.zw += 1.0 - isYZ.xy;
i0.z += isYZ.z;
i0.w += 1.0 - isYZ.z;

vec4 i3 = clamp( i0, 0.0, 1.0 );
vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

vec4 x1 = x0 - i1 + C.xxxx;
vec4 x2 = x0 - i2 + C.yyyy;
vec4 x3 = x0 - i3 + C.zzzz;
vec4 x4 = x0 + C.wwww;

i = mod289(i); 
float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
vec4 j1 = permute( permute( permute( permute (
i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
+ i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
+ i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
+ i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

vec4 p0 = grad4(j0,   ip);
vec4 p1 = grad4(j1.x, ip);
vec4 p2 = grad4(j1.y, ip);
vec4 p3 = grad4(j1.z, ip);
vec4 p4 = grad4(j1.w, ip);

vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
p0 *= norm.x;
p1 *= norm.y;
p2 *= norm.z;
p3 *= norm.w;
p4 *= taylorInvSqrt(dot(p4,p4));

vec3 values0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)); //value of contributions from each corner at point
vec2 values1 = vec2(dot(p3, x3), dot(p4, x4));

vec3 m0 = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0); //(0.5 - x^2) where x is the distance
vec2 m1 = max(0.5 - vec2(dot(x3,x3), dot(x4,x4)), 0.0);

vec3 temp0 = -6.0 * m0 * m0 * values0;
vec2 temp1 = -6.0 * m1 * m1 * values1;

vec3 mmm0 = m0 * m0 * m0;
vec2 mmm1 = m1 * m1 * m1;

float dx = temp0[0] * x0.x + temp0[1] * x1.x + temp0[2] * x2.x + temp1[0] * x3.x + temp1[1] * x4.x + mmm0[0] * p0.x + mmm0[1] * p1.x + mmm0[2] * p2.x + mmm1[0] * p3.x + mmm1[1] * p4.x;
float dy = temp0[0] * x0.y + temp0[1] * x1.y + temp0[2] * x2.y + temp1[0] * x3.y + temp1[1] * x4.y + mmm0[0] * p0.y + mmm0[1] * p1.y + mmm0[2] * p2.y + mmm1[0] * p3.y + mmm1[1] * p4.y;
float dz = temp0[0] * x0.z + temp0[1] * x1.z + temp0[2] * x2.z + temp1[0] * x3.z + temp1[1] * x4.z + mmm0[0] * p0.z + mmm0[1] * p1.z + mmm0[2] * p2.z + mmm1[0] * p3.z + mmm1[1] * p4.z;
float dw = temp0[0] * x0.w + temp0[1] * x1.w + temp0[2] * x2.w + temp1[0] * x3.w + temp1[1] * x4.w + mmm0[0] * p0.w + mmm0[1] * p1.w + mmm0[2] * p2.w + mmm1[0] * p3.w + mmm1[1] * p4.w;

return vec4(dx, dy, dz, dw) * 49.0;
}

void main () {
vec2 textureCoordinates = gl_FragCoord.xy / u_resolution;
vec4 data = texture2D(u_particleTexture, textureCoordinates);

vec3 oldPosition = data.rgb;

vec3 noisePosition = oldPosition * ${NOISE_POSITION_SCALE.toFixed(8)};

float noiseTime = u_time * ${NOISE_TIME_SCALE.toFixed(8)};

vec4 xNoisePotentialDerivatives = vec4(0.0);
vec4 yNoisePotentialDerivatives = vec4(0.0);
vec4 zNoisePotentialDerivatives = vec4(0.0);

float persistence = u_persistence;

for (int i = 0; i < OCTAVES; ++i) {
float scale = (1.0 / 2.0) * pow(2.0, float(i));

float noiseScale = pow(persistence, float(i));
if (persistence == 0.0 && i == 0) { //fix undefined behaviour
noiseScale = 1.0;
}

xNoisePotentialDerivatives += simplexNoiseDerivatives(vec4(noisePosition * pow(2.0, float(i)), noiseTime)) * noiseScale * scale;
yNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((noisePosition + vec3(123.4, 129845.6, -1239.1)) * pow(2.0, float(i)), noiseTime)) * noiseScale * scale;
zNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((noisePosition + vec3(-9519.0, 9051.0, -123.0)) * pow(2.0, float(i)), noiseTime)) * noiseScale * scale;
}

//compute curl
vec3 noiseVelocity = vec3(
zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2],
xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0],
yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]
) * ${NOISE_SCALE.toFixed(8)};

vec3 velocity = vec3(${BASE_SPEED.toFixed(8)}, 0.0, 0.0);
vec3 totalVelocity = velocity + noiseVelocity;

vec3 newPosition = oldPosition + totalVelocity * u_deltaTime;

float oldLifetime = data.a;
float newLifetime = oldLifetime - u_deltaTime;

vec4 spawnData = texture2D(u_spawnTexture, textureCoordinates);

if (newLifetime < 0.0) {
newPosition = spawnData.rgb;
newLifetime = spawnData.a + newLifetime;
}

gl_FragColor = vec4(newPosition, newLifetime);
}`

export var RENDERING_VERTEX_SHADER_SOURCE = glsl`
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
`

export var RENDERING_FRAGMENT_SHADER_SOURCE = glsl`
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
}`

export var OPACITY_VERTEX_SHADER_SOURCE = glsl`  
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
}`

export var OPACITY_FRAGMENT_SHADER_SOURCE = glsl`
precision highp float;

uniform float u_particleAlpha;

void main () {
  float distanceFromCenter = distance(gl_PointCoord.xy, vec2(0.5, 0.5));
  if (distanceFromCenter > 0.5) discard;
  float alpha = clamp(1.0 - distanceFromCenter * 2.0, 0.0, 1.0) * u_particleAlpha;

  gl_FragColor = vec4(1.0, 1.0, 1.0, alpha); //under operator requires this premultiplication
}`

export var SORT_VERTEX_SHADER_SOURCE = glsl`
precision highp float;

attribute vec2 a_position;

void main () {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

export var SORT_FRAGMENT_SHADER_SOURCE = glsl`precision highp float;

uniform sampler2D u_dataTexture;

uniform vec2 u_resolution;

uniform float pass;
uniform float stage;

uniform vec3 u_cameraPosition;

uniform vec3 u_halfVector;

void main () {
vec2 normalizedCoordinates = gl_FragCoord.xy / u_resolution;

vec4 self = texture2D(u_dataTexture, normalizedCoordinates);

float i = floor(normalizedCoordinates.x * u_resolution.x) + floor(normalizedCoordinates.y * u_resolution.y) * u_resolution.x;

float j = floor(mod(i, 2.0 * stage));

float compare = 0.0;

if ((j < mod(pass, stage)) || (j > (2.0 * stage - mod(pass, stage) - 1.0))) {
compare = 0.0;
} else {
if (mod((j + mod(pass, stage)) / pass, 2.0) < 1.0) {
compare = 1.0;
} else {
compare = -1.0;
}
}

float adr = i + compare * pass;

vec4 partner = texture2D(u_dataTexture, vec2(floor(mod(adr, u_resolution.x)) / u_resolution.x, floor(adr / u_resolution.x) / u_resolution.y));

float selfProjectedLength = dot(u_halfVector, self.xyz);
float partnerProjectedLength = dot(u_halfVector, partner.xyz);

gl_FragColor = (selfProjectedLength * compare < partnerProjectedLength * compare) ? self : partner;
}`

export var RESAMPLE_VERTEX_SHADER_SOURCE = glsl`
precision highp float;

attribute vec2 a_position;
varying vec2 v_coordinates;

void main () {
v_coordinates = a_position.xy * 0.5 + 0.5;
gl_Position = vec4(a_position, 0.0, 1.0);
}`

export var RESAMPLE_FRAGMENT_SHADER_SOURCE = glsl`
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

export var FLOOR_VERTEX_SHADER_SOURCE = glsl`
precision highp float;

attribute vec3 a_vertexPosition;

varying vec3 v_position;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

void main () {
v_position = a_vertexPosition;
gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_vertexPosition, 1.0);
}`

export var FLOOR_FRAGMENT_SHADER_SOURCE = glsl`
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
}`

export var BACKGROUND_VERTEX_SHADER_SOURCE = glsl`
precision highp float;

attribute vec2 a_position;

varying vec2 v_position;

void main () {
v_position = a_position;
gl_Position = vec4(a_position, 0.0, 1.0);
}`

export var BACKGROUND_FRAGMENT_SHADER_SOURCE = glsl`
precision highp float;

varying vec2 v_position;

void main () {
  float dist = length(v_position);
  gl_FragColor = vec4(vec3(1.0) - dist * ${BACKGROUND_DISTANCE_SCALE.toFixed(
    8
  )}, 1.0);
}`
