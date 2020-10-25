import Camera from '../camera'
import { ProgramWrapper } from '../shaders'
import {
  BASE_LIFETIME,
  buildTexture,
  MAX_ADDITIONAL_LIFETIME,
  OFFSET_RADIUS,
  OPACITY_TEXTURE_RESOLUTION,
  QUALITY_LEVELS,
  SLICES,
  SPAWN_RADIUS,
} from '../shared'

export default function makeParticleVertexBuffer(
  gl: WebGLRenderingContext,
  maxParticleCount: number,
  randomSpherePoints: [number, number, number][]
) {
  const spawnTextures: WebGLTexture[] = [] //one for each quality level
  const particleVertexBuffers: WebGLBuffer[] = [] //one for each quality level

  const randomNumbers = []
  for (let i = 0; i < maxParticleCount; ++i) {
    randomNumbers[i] = Math.random()
  }

  for (let i = 0; i < QUALITY_LEVELS.length; ++i) {
    const width = QUALITY_LEVELS[i].resolution[0]
    const height = QUALITY_LEVELS[i].resolution[1]

    const count = width * height

    particleVertexBuffers[i] = makeParticleVertexBuffer2(gl, width, height)
    spawnTextures[i] = makeSpawnTexture(
      gl,
      count,
      randomSpherePoints,
      randomNumbers,
      width,
      height
    )
  }

  const offsetData = new Float32Array(maxParticleCount * 4)
  for (let i = 0; i < maxParticleCount; ++i) {
    const position = randomSpherePoints[i]

    const positionX = position[0] * OFFSET_RADIUS
    const positionY = position[1] * OFFSET_RADIUS
    const positionZ = position[2] * OFFSET_RADIUS

    offsetData[i * 4] = positionX
    offsetData[i * 4 + 1] = positionY
    offsetData[i * 4 + 2] = positionZ
    offsetData[i * 4 + 3] = 0.0
  }

  const offsetTexture = buildTexture(
    gl,
    0,
    gl.RGBA,
    gl.FLOAT,
    QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[0],
    QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[1],
    offsetData,
    gl.CLAMP_TO_EDGE,
    gl.CLAMP_TO_EDGE,
    gl.NEAREST,
    gl.NEAREST
  )

  return { spawnTextures, particleVertexBuffers, offsetTexture }
}

export function makeParticleVertexBuffer2(
  gl: WebGLRenderingContext,
  width: number,
  height: number
) {
  const particleVertexBuffer = gl.createBuffer()

  const particleTextureCoordinates = new Float32Array(width * height * 2)
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      particleTextureCoordinates[(y * width + x) * 2] = (x + 0.5) / width
      particleTextureCoordinates[(y * width + x) * 2 + 1] = (y + 0.5) / height
    }
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, particleTextureCoordinates, gl.STATIC_DRAW)
  return particleVertexBuffer as WebGLBuffer
}

export function makeSpawnTexture(
  gl: WebGLRenderingContext,
  count: number,
  randomSpherePoints: [number, number, number][],
  randomNumbers: number[],
  width: number,
  height: number
) {
  const spawnData = new Float32Array(count * 4)
  for (let j = 0; j < count; ++j) {
    const position = randomSpherePoints[j]

    const positionX = position[0] * SPAWN_RADIUS
    const positionY = position[1] * SPAWN_RADIUS
    const positionZ = position[2] * SPAWN_RADIUS
    const lifetime = BASE_LIFETIME + randomNumbers[j] * MAX_ADDITIONAL_LIFETIME

    spawnData[j * 4] = positionX
    spawnData[j * 4 + 1] = positionY
    spawnData[j * 4 + 2] = positionZ
    spawnData[j * 4 + 3] = lifetime
  }

  return buildTexture(
    gl,
    0,
    gl.RGBA,
    gl.FLOAT,
    width,
    height,
    spawnData,
    gl.CLAMP_TO_EDGE,
    gl.CLAMP_TO_EDGE,
    gl.NEAREST,
    gl.NEAREST
  )
}

export function renderToOpacityTexture({
  gl,
  opacityFramebuffer,
  opacityProgramWrapper,
  lightViewMatrix,
  lightProjectionMatrix,
  particleDiameter,
  particleAlpha,
  particleTextureA,
  particleVertexBuffer,
  sliceNum,
  particleCount,
}: {
  gl: WebGLRenderingContext
  opacityFramebuffer: WebGLFramebuffer
  opacityProgramWrapper: ProgramWrapper
  lightViewMatrix: Float32Array | number[]
  lightProjectionMatrix: Float32Array | number[]
  particleDiameter: number
  particleAlpha: number
  particleTextureA: WebGLTexture
  particleVertexBuffer: WebGLBuffer
  sliceNum: number
  particleCount: number
}) {
  //render to opacity texture
  gl.bindFramebuffer(gl.FRAMEBUFFER, opacityFramebuffer)

  gl.viewport(0, 0, OPACITY_TEXTURE_RESOLUTION, OPACITY_TEXTURE_RESOLUTION)

  gl.useProgram(opacityProgramWrapper.program)

  gl.uniform1i(opacityProgramWrapper.uniformLocations['u_particleTexture'], 0)

  gl.uniformMatrix4fv(
    opacityProgramWrapper.uniformLocations['u_lightViewMatrix'],
    false,
    lightViewMatrix
  )
  gl.uniformMatrix4fv(
    opacityProgramWrapper.uniformLocations['u_lightProjectionMatrix'],
    false,
    lightProjectionMatrix
  )

  gl.uniform1f(
    opacityProgramWrapper.uniformLocations['u_particleDiameter'],
    particleDiameter
  )
  gl.uniform1f(
    opacityProgramWrapper.uniformLocations['u_screenWidth'],
    OPACITY_TEXTURE_RESOLUTION
  )

  gl.uniform1f(
    opacityProgramWrapper.uniformLocations['u_particleAlpha'],
    particleAlpha
  )

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, particleTextureA)

  gl.enableVertexAttribArray(0)
  gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexBuffer)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  gl.enable(gl.BLEND)
  // @ts-ignore
  gl.blendEquation(gl.FUNC_ADD, gl.FUNC_ADD)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  gl.drawArrays(
    gl.POINTS,
    sliceNum * (particleCount / SLICES),
    particleCount / SLICES
  )
}