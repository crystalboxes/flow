import {
  buildTexture,
  OPACITY_TEXTURE_RESOLUTION,
  buildFramebuffer,
} from '../shared'
import {
  makeFullscreenVertexBuffer,
  makeFloorVertexBuffer,
} from './vertex-buffers'

export function createTextureResources(gl: WebGLRenderingContext) {
  let particleTextureA = buildTexture(
    gl,
    0,
    gl.RGBA,
    gl.FLOAT,
    1,
    1,
    null,
    gl.CLAMP_TO_EDGE,
    gl.CLAMP_TO_EDGE,
    gl.NEAREST,
    gl.NEAREST
  )
  let particleTextureB = buildTexture(
    gl,
    0,
    gl.RGBA,
    gl.FLOAT,
    1,
    1,
    null,
    gl.CLAMP_TO_EDGE,
    gl.CLAMP_TO_EDGE,
    gl.NEAREST,
    gl.NEAREST
  )

  const opacityTexture = buildTexture(
    gl,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    OPACITY_TEXTURE_RESOLUTION,
    OPACITY_TEXTURE_RESOLUTION,
    null,
    gl.CLAMP_TO_EDGE,
    gl.CLAMP_TO_EDGE,
    gl.LINEAR,
    gl.LINEAR
  ) //opacity from the light's point of view
  const opacityFramebuffer = buildFramebuffer(
    gl,
    opacityTexture
  ) as WebGLFramebuffer

  const simulationFramebuffer = gl.createFramebuffer() as WebGLFramebuffer
  const sortFramebuffer = gl.createFramebuffer() as WebGLFramebuffer
  const resampleFramebuffer = gl.createFramebuffer() as WebGLFramebuffer

  const fullscreenVertexBuffer = makeFullscreenVertexBuffer(gl)
  const floorVertexBuffer = makeFloorVertexBuffer(gl)

  return {
    particleTextureA,
    particleTextureB,
    opacityTexture,
    opacityFramebuffer,
    simulationFramebuffer,
    sortFramebuffer,
    resampleFramebuffer,
    fullscreenVertexBuffer,
    floorVertexBuffer,
  }
}
