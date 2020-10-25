import { ProgramWrapper } from '../shaders'
import { randomPointInSphere, SPAWN_RADIUS, BASE_LIFETIME } from '../shared'

export function makeParticleData(
  gl: WebGLRenderingContext,
  particleCount: number,
  particleCountWidth: number,
  particleCountHeight: number,
  particleTextureA: WebGLTexture,
  particleTextureB: WebGLTexture
) {
  const particleData = new Float32Array(particleCount * 4)

  for (let i = 0; i < particleCount; ++i) {
    const position = randomPointInSphere()

    const positionX = position[0] * SPAWN_RADIUS
    const positionY = position[1] * SPAWN_RADIUS
    const positionZ = position[2] * SPAWN_RADIUS

    particleData[i * 4] = positionX
    particleData[i * 4 + 1] = positionY
    particleData[i * 4 + 2] = positionZ
    particleData[i * 4 + 3] = Math.random() * BASE_LIFETIME
  }

  gl.bindTexture(gl.TEXTURE_2D, particleTextureA)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    particleCountWidth,
    particleCountHeight,
    0,
    gl.RGBA,
    gl.FLOAT,
    particleData
  )

  gl.bindTexture(gl.TEXTURE_2D, particleTextureB)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    particleCountWidth,
    particleCountHeight,
    0,
    gl.RGBA,
    gl.FLOAT,
    null
  )
}

export const resampleTextures = ({
  gl,
  particleTextureA,
  particleTextureB,
  particleCountWidth,
  particleCountHeight,
  fullscreenVertexBuffer,
  resampleProgramWrapper,
  particleCount,
  oldParticleCountWidth,
  oldParticleCountHeight,
  oldParticleDiameter,
  offsetTexture,
  resampleFramebuffer,
}: {
  gl: WebGLRenderingContext
  particleCount: number
  particleCountWidth: number
  particleCountHeight: number
  oldParticleCountWidth: number
  oldParticleCountHeight: number
  oldParticleDiameter: number
  particleTextureA: WebGLTexture
  particleTextureB: WebGLTexture
  fullscreenVertexBuffer: WebGLBuffer
  resampleProgramWrapper: ProgramWrapper
  resampleFramebuffer: WebGLFramebuffer
  offsetTexture: WebGLTexture
}) => {
  //resample from A into B
  gl.bindTexture(gl.TEXTURE_2D, particleTextureB)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    particleCountWidth,
    particleCountHeight,
    0,
    gl.RGBA,
    gl.FLOAT,
    null
  )

  gl.enableVertexAttribArray(0)
  gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  gl.enableVertexAttribArray(0)

  gl.useProgram(resampleProgramWrapper.program)
  gl.uniform1i(resampleProgramWrapper.uniformLocations['u_particleTexture'], 0)
  gl.uniform1i(resampleProgramWrapper.uniformLocations['u_offsetTexture'], 1)

  if (particleCount > oldParticleCountWidth * oldParticleCountHeight) {
    //if we are upsampling we need to add random sphere offsets
    gl.uniform1f(
      resampleProgramWrapper.uniformLocations['u_offsetScale'],
      oldParticleDiameter
    )
  } else {
    //if downsampling we can just leave positions as they are
    gl.uniform1f(resampleProgramWrapper.uniformLocations['u_offsetScale'], 0)
  }

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, particleTextureA)

  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, offsetTexture)

  gl.bindFramebuffer(gl.FRAMEBUFFER, resampleFramebuffer)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    particleTextureB,
    0
  )

  gl.viewport(0, 0, particleCountWidth, particleCountHeight)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  gl.bindTexture(gl.TEXTURE_2D, particleTextureA)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    particleCountWidth,
    particleCountHeight,
    0,
    gl.RGBA,
    gl.FLOAT,
    null
  )

  const temp = particleTextureA
  particleTextureA = particleTextureB
  particleTextureB = temp
}
