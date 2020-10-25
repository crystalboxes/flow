//@ts-ignore
import glsl from 'glslify'
import { BACKGROUND_DISTANCE_SCALE } from '../shared'

const vertex = glsl`
precision highp float;

attribute vec2 a_position;

varying vec2 v_position;

void main () {
v_position = a_position;
gl_Position = vec4(a_position, 0.0, 1.0);
}`

const fragment = glsl`
precision highp float;

varying vec2 v_position;

void main () {
  float dist = length(v_position);
  gl_FragColor = vec4(vec3(1.0) - dist * ${BACKGROUND_DISTANCE_SCALE.toFixed(
    8
  )}, 1.0);
}`

export default {
  vertex,
  fragment,
}
