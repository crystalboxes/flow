import Camera from '../camera'
import { ProgramWrapper } from '../shaders'
import { SimulationShader } from '../shaders/simulation'
import {
  hsvToRGB,
  PARTICLE_SATURATION,
  PARTICLE_VALUE,
  SLICES,
} from '../shared'

export function doSimulationStep(
  gl: WebGLRenderingContext,
  particleCountWidth: number,
  particleCountHeight: number,
  persistence: number,
  fullscreenVertexBuffer: WebGLBuffer,
  simulationProgramWrapper: SimulationShader,
  simulationTime: number,
  simulationDeltaTime: number,
  spawnTexture: WebGLTexture,
  particleTextureA: WebGLTexture,
  particleTextureB: WebGLTexture,
  simulationFramebuffer: WebGLFramebuffer
) {
  gl.enableVertexAttribArray(0)
  gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  gl.useProgram(simulationProgramWrapper.program)
  gl.uniform2f(
    simulationProgramWrapper.uniformLocations.u_resolution,
    particleCountWidth,
    particleCountHeight
  )
  gl.uniform1f(
    simulationProgramWrapper.uniformLocations.u_deltaTime,
    simulationDeltaTime
  )
  gl.uniform1f(simulationProgramWrapper.uniformLocations.u_time, simulationTime)
  gl.uniform1i(simulationProgramWrapper.uniformLocations.u_particleTexture, 0)

  gl.uniform1f(
    simulationProgramWrapper.uniformLocations.u_persistence,
    persistence
  )

  gl.uniform1i(simulationProgramWrapper.uniformLocations.u_spawnTexture, 1)

  gl.disable(gl.BLEND)

  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, spawnTexture)

  //render from A -> B
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, particleTextureA)

  gl.bindFramebuffer(gl.FRAMEBUFFER, simulationFramebuffer)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    particleTextureB,
    0
  )

  gl.viewport(0, 0, particleCountWidth, particleCountHeight)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

export function doSortPass(
  gl: WebGLRenderingContext,
  sortProgramWrapper: ProgramWrapper,
  particleCountWidth: number,
  particleCountHeight: number,
  sortPass: number,
  sortStage: number,
  halfVector: Float32Array,
  sortFramebuffer: WebGLFramebuffer,
  particleTextureA: WebGLTexture,
  particleTextureB: WebGLTexture
) {
  gl.useProgram(sortProgramWrapper.program)

  gl.uniform1i(sortProgramWrapper.uniformLocations['u_dataTexture'], 0)
  gl.uniform2f(
    sortProgramWrapper.uniformLocations['u_resolution'],
    particleCountWidth,
    particleCountHeight
  )

  gl.uniform1f(sortProgramWrapper.uniformLocations['pass'], 1 << sortPass)
  gl.uniform1f(sortProgramWrapper.uniformLocations['stage'], 1 << sortStage)

  gl.uniform3fv(sortProgramWrapper.uniformLocations['u_halfVector'], halfVector)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, particleTextureA)

  gl.bindFramebuffer(gl.FRAMEBUFFER, sortFramebuffer)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    particleTextureB,
    0
  )

  gl.viewport(0, 0, particleCountWidth, particleCountHeight)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

export function renderParticles({
  gl,
  width,
  height,
  renderingProgramWrapper,
  camera,
  projectionMatrix,
  lightViewProjectionMatrix,
  particleDiameter,
  particleAlpha,
  hue,
  particleTextureA,
  opacityTexture,
  particleVertexBuffer,
  flipped,
  sliceNum,
  particleCount,
}: {
  gl: WebGLRenderingContext
  width: number
  height: number
  renderingProgramWrapper: ProgramWrapper

  camera: Camera
  projectionMatrix: Float32Array | number[]
  lightViewProjectionMatrix: Float32Array | number[]
  particleDiameter: number
  particleAlpha: number
  hue: number
  particleTextureA: WebGLTexture
  opacityTexture: WebGLTexture
  particleVertexBuffer: WebGLBuffer
  flipped: boolean
  sliceNum: number
  particleCount: number
}) {
  //render particles
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0, 0, width, height)

  gl.useProgram(renderingProgramWrapper.program)

  gl.uniform1i(renderingProgramWrapper.uniformLocations['u_particleTexture'], 0)
  gl.uniform1i(renderingProgramWrapper.uniformLocations['u_opacityTexture'], 1)

  gl.uniformMatrix4fv(
    renderingProgramWrapper.uniformLocations['u_viewMatrix'],
    false,
    camera.getViewMatrix()
  )
  gl.uniformMatrix4fv(
    renderingProgramWrapper.uniformLocations['u_projectionMatrix'],
    false,
    projectionMatrix
  )

  gl.uniformMatrix4fv(
    renderingProgramWrapper.uniformLocations['u_lightViewProjectionMatrix'],
    false,
    lightViewProjectionMatrix
  )

  gl.uniform1f(
    renderingProgramWrapper.uniformLocations['u_particleDiameter'],
    particleDiameter
  )
  gl.uniform1f(renderingProgramWrapper.uniformLocations['u_screenWidth'], width)

  gl.uniform1f(
    renderingProgramWrapper.uniformLocations['u_particleAlpha'],
    particleAlpha
  )

  const colorRGB = hsvToRGB(hue, PARTICLE_SATURATION, PARTICLE_VALUE)
  gl.uniform3f(
    renderingProgramWrapper.uniformLocations['u_particleColor'],
    colorRGB[0],
    colorRGB[1],
    colorRGB[2]
  )

  gl.uniform1i(
    renderingProgramWrapper.uniformLocations['u_flipped'],
    flipped ? 1 : 0
  )

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, particleTextureA)

  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, opacityTexture)

  gl.enableVertexAttribArray(0)
  gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexBuffer)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  if (!flipped) {
    gl.enable(gl.BLEND)
    // @ts-ignore
    gl.blendEquation(gl.FUNC_ADD, gl.FUNC_ADD)
    gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE)
  } else {
    gl.enable(gl.BLEND)
    // @ts-ignore
    gl.blendEquation(gl.FUNC_ADD, gl.FUNC_ADD)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  }

  gl.drawArrays(
    gl.POINTS,
    sliceNum * (particleCount / SLICES),
    particleCount / SLICES
  )
}

export function renderBackground({
  gl,
  width,
  height,
  floorProgramWrapper,
  floorVertexBuffer,
  camera,
  projectionMatrix,
  lightViewProjectionMatrix,
  opacityTexture,
  backgroundProgramWrapper,
  fullscreenVertexBuffer,
}: {
  gl: WebGLRenderingContext
  width: number
  height: number
  floorProgramWrapper: ProgramWrapper
  floorVertexBuffer: WebGLBuffer
  camera: Camera
  projectionMatrix: Float32Array | number[]
  opacityTexture: WebGLTexture
  lightViewProjectionMatrix: Float32Array | number[]
  fullscreenVertexBuffer: WebGLBuffer
  backgroundProgramWrapper: ProgramWrapper
}) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0, 0, width, height)

  gl.useProgram(floorProgramWrapper.program)

  gl.enableVertexAttribArray(0)
  gl.bindBuffer(gl.ARRAY_BUFFER, floorVertexBuffer)
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)

  gl.uniformMatrix4fv(
    floorProgramWrapper.uniformLocations['u_viewMatrix'],
    false,
    camera.getViewMatrix()
  )
  gl.uniformMatrix4fv(
    floorProgramWrapper.uniformLocations['u_projectionMatrix'],
    false,
    projectionMatrix
  )

  gl.uniformMatrix4fv(
    floorProgramWrapper.uniformLocations['u_lightViewProjectionMatrix'],
    false,
    lightViewProjectionMatrix
  )

  gl.uniform1i(floorProgramWrapper.uniformLocations['u_opacityTexture'], 0)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, opacityTexture)

  gl.enable(gl.BLEND)
  // @ts-ignore
  gl.blendEquation(gl.FUNC_ADD, gl.FUNC_ADD)
  gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  gl.viewport(0, 0, width, height)

  gl.enableVertexAttribArray(0)
  gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  gl.useProgram(backgroundProgramWrapper.program)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}
