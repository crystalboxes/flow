import glsl from 'glslify'

var vertex = glsl`
precision highp float;

attribute vec2 a_position;

void main () {
  gl_Position = vec4(a_position, 0.0, 1.0);
}` as string

var fragment = glsl`precision highp float;

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
}` as string
export default { vertex, fragment }
