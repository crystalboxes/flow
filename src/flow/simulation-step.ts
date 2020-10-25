import { SimulationShader } from '../shaders/simulation'

export function doSimulationStep(
  gl: WebGLRenderingContext,
  particleCountWidth,
  particleCountHeight,
  persistence,
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
}
