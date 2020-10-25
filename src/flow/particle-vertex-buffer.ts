import {
  BASE_LIFETIME,
  buildTexture,
  MAX_ADDITIONAL_LIFETIME,
  QUALITY_LEVELS,
  SPAWN_RADIUS,
} from '../shared'

export default function makeParticleVertexBuffer(
  gl: WebGLRenderingContext,
  maxParticleCount: number,
  randomSpherePoints: [number, number, number][]
) {
  const randomNumbers = []
  for (let i = 0; i < maxParticleCount; ++i) {
    randomNumbers[i] = Math.random()
  }

  const particleVertexBuffers: any[] = [] //one for each quality level
  const spawnTextures: any[] = [] //one for each quality level

  for (let i = 0; i < QUALITY_LEVELS.length; ++i) {
    const width = QUALITY_LEVELS[i].resolution[0]
    const height = QUALITY_LEVELS[i].resolution[1]

    const count = width * height

    particleVertexBuffers[i] = gl.createBuffer()

    const particleTextureCoordinates = new Float32Array(width * height * 2)
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        particleTextureCoordinates[(y * width + x) * 2] = (x + 0.5) / width
        particleTextureCoordinates[(y * width + x) * 2 + 1] = (y + 0.5) / height
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexBuffers[i])
    gl.bufferData(gl.ARRAY_BUFFER, particleTextureCoordinates, gl.STATIC_DRAW)

    const spawnData = new Float32Array(count * 4)
    for (let j = 0; j < count; ++j) {
      const position = randomSpherePoints[j]

      const positionX = position[0] * SPAWN_RADIUS
      const positionY = position[1] * SPAWN_RADIUS
      const positionZ = position[2] * SPAWN_RADIUS
      const lifetime =
        BASE_LIFETIME + randomNumbers[j] * MAX_ADDITIONAL_LIFETIME

      spawnData[j * 4] = positionX
      spawnData[j * 4 + 1] = positionY
      spawnData[j * 4 + 2] = positionZ
      spawnData[j * 4 + 3] = lifetime
    }

    spawnTextures[i] = buildTexture(
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

    return {
      particleVertexBuffers,
      spawnTextures,
    }
  }
}
