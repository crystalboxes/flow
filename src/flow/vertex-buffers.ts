import { FLOOR_ORIGIN, FLOOR_HEIGHT, FLOOR_WIDTH } from '../shared'

export function makeFloorVertexBuffer(gl: WebGLRenderingContext) {
  const floorVertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, floorVertexBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      FLOOR_ORIGIN[0],
      FLOOR_ORIGIN[1],
      FLOOR_ORIGIN[2],
      FLOOR_ORIGIN[0],
      FLOOR_ORIGIN[1],
      FLOOR_ORIGIN[2] + FLOOR_HEIGHT,
      FLOOR_ORIGIN[0] + FLOOR_WIDTH,
      FLOOR_ORIGIN[1],
      FLOOR_ORIGIN[2],
      FLOOR_ORIGIN[0] + FLOOR_WIDTH,
      FLOOR_ORIGIN[1],
      FLOOR_ORIGIN[2] + FLOOR_HEIGHT,
    ]),
    gl.STATIC_DRAW
  )
  return floorVertexBuffer as WebGLBuffer
}

export function makeFullscreenVertexBuffer(gl: WebGLRenderingContext) {
  const fullscreenVertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
    gl.STATIC_DRAW
  )

  return fullscreenVertexBuffer as WebGLBuffer
}
