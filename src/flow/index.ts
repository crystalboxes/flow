import Camera from '../camera'
import {
  background,
  floor,
  opacity,
  rendering,
  resample,
  simulation,
  soft,
} from '../shaders'
import { SimulationShader } from '../shaders/simulation'
import {
  FLOOR_ORIGIN,
  premultiplyMatrix,
  QUALITY_LEVELS,
  randomPointInSphere,
  SPAWN_RADIUS,
  BASE_LIFETIME,
  MAX_ADDITIONAL_LIFETIME,
  buildTexture,
  OFFSET_RADIUS,
  makePerspectiveMatrix,
  PROJECTION_FOV,
  ASPECT_RATIO,
  PROJECTION_NEAR,
  PROJECTION_FAR,
  makeLookAtMatrix,
  LIGHT_DIRECTION,
  LIGHT_UP_VECTOR,
  makeOrthographicMatrix,
  LIGHT_PROJECTION_LEFT,
  LIGHT_PROJECTION_RIGHT,
  LIGHT_PROJECTION_BOTTOM,
  LIGHT_PROJECTION_TOP,
  LIGHT_PROJECTION_NEAR,
  LIGHT_PROJECTION_FAR,
  INITIAL_SPEED,
  INITIAL_TURBULENCE,
  log2,
  OPACITY_TEXTURE_RESOLUTION,
  buildFramebuffer,
  buildProgramWrapper,
  buildShader,
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  MAX_DELTA_TIME,
  dotVectors,
  normalizeVector,
  PRESIMULATION_DELTA_TIME,
  SORT_PASSES_PER_FRAME,
  SLICES,
  hsvToRGB,
  PARTICLE_SATURATION,
  PARTICLE_VALUE,
} from '../shared'
import buildShaderPrograms from './build-shader-programs'
import makeMatrices from './make-matrices'
import { makeParticleData } from './particles-initialization'
import {
  makeFloorVertexBuffer,
  makeFullscreenVertexBuffer,
} from './vertex-buffers'

export default class Flow {
  hue = 0
  timeScale = INITIAL_SPEED
  persistence = INITIAL_TURBULENCE
  qualityLevel = -1
  particleAlpha = 0.0

  particleCountWidth = 0
  particleCountHeight = 0
  particleCount = 0

  particleDiameter = 0.0

  changingParticleCount = false
  oldParticleDiameter: number
  oldParticleCountWidth: number
  oldParticleCountHeight: number

  constructor(canvas: HTMLCanvasElement) {
    const options = {
      premultipliedAlpha: false,
      alpha: true,
    }

    const gl = canvas.getContext('webgl', options) as WebGLRenderingContext
    if (!gl) {
      throw new Error('')
    }

    gl.getExtension('OES_texture_float')
    gl.clearColor(0.0, 0.0, 0.0, 0.0)

    const maxParticleCount =
      QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[0] *
      QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[1]

    const randomNumbers = []
    for (let i = 0; i < maxParticleCount; ++i) {
      randomNumbers[i] = Math.random()
    }

    const randomSpherePoints = []
    for (let i = 0; i < maxParticleCount; ++i) {
      const point = randomPointInSphere()
      randomSpherePoints.push(point)
    }

    let particleVertexBuffer: any
    let spawnTexture: any

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
          particleTextureCoordinates[(y * width + x) * 2 + 1] =
            (y + 0.5) / height
        }
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexBuffers[i])
      gl.bufferData(gl.ARRAY_BUFFER, particleTextureCoordinates, gl.STATIC_DRAW)

      // @ts-ignore
      // delete particleTextureCoordinates

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

      // @ts-ignore
      // delete spawnData
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

    this.particleCount = this.particleCountWidth * this.particleCountHeight

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

    const camera = new Camera(canvas)

    const {
      projectionMatrix,
      lightViewMatrix,
      lightProjectionMatrix,
      lightViewProjectionMatrix,
    } = makeMatrices()

    const resampleFramebuffer = gl.createFramebuffer()

    this.changeQualityLevel(0)

    //variables used for sorting
    let totalSortSteps =
      (log2(this.particleCount) * (log2(this.particleCount) + 1)) / 2
    let sortStepsLeft = totalSortSteps
    let sortPass = -1
    let sortStage = -1

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

    const simulationFramebuffer = gl.createFramebuffer()
    const sortFramebuffer = gl.createFramebuffer()

    const opacityFramebuffer = buildFramebuffer(gl, opacityTexture)

    const {
      simulationProgramWrapper,
      renderingProgramWrapper,
      opacityProgramWrapper,
      sortProgramWrapper,
      resampleProgramWrapper,
      floorProgramWrapper,
      backgroundProgramWrapper,
    } = buildShaderPrograms(gl)

    const fullscreenVertexBuffer = makeFullscreenVertexBuffer(gl)

    const floorVertexBuffer = makeFloorVertexBuffer(gl)

    const onresize = function () {
      const aspectRatio = window.innerWidth / window.innerHeight
      makePerspectiveMatrix(
        projectionMatrix,
        PROJECTION_FOV,
        aspectRatio,
        PROJECTION_NEAR,
        PROJECTION_FAR
      )
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', onresize)
    onresize()

    let firstFrame = true

    let flipped = false

    let lastTime = 0.0
    const render = (currentTime?: number) => {
      if (!currentTime) {
        currentTime = 0
      }
      let deltaTime = (currentTime - lastTime) / 1000 || 0.0
      lastTime = currentTime

      if (deltaTime > MAX_DELTA_TIME) {
        deltaTime = 0
      }

      if (this.changingParticleCount) {
        deltaTime = 0
        this.changingParticleCount = false

        particleVertexBuffer = particleVertexBuffers[this.qualityLevel]
        spawnTexture = spawnTextures[this.qualityLevel]

        //reset sort
        totalSortSteps =
          (log2(this.particleCount) * (log2(this.particleCount) + 1)) / 2
        sortStepsLeft = totalSortSteps
        sortPass = -1
        sortStage = -1

        if (
          this.oldParticleCountHeight === 0 &&
          this.oldParticleCountWidth === 0
        ) {
          //initial generation
          makeParticleData(
            gl,
            this.particleCount,
            this.particleCountWidth,
            this.particleCountHeight,
            particleTextureA,
            particleTextureB
          )
        } else {
          //resample from A into B
          gl.bindTexture(gl.TEXTURE_2D, particleTextureB)
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.particleCountWidth,
            this.particleCountHeight,
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
          gl.uniform1i(
            resampleProgramWrapper.uniformLocations['u_particleTexture'],
            0
          )
          gl.uniform1i(
            resampleProgramWrapper.uniformLocations['u_offsetTexture'],
            1
          )

          if (
            this.particleCount >
            this.oldParticleCountWidth * this.oldParticleCountHeight
          ) {
            //if we are upsampling we need to add random sphere offsets
            gl.uniform1f(
              resampleProgramWrapper.uniformLocations['u_offsetScale'],
              this.oldParticleDiameter
            )
          } else {
            //if downsampling we can just leave positions as they are
            gl.uniform1f(
              resampleProgramWrapper.uniformLocations['u_offsetScale'],
              0
            )
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

          gl.viewport(0, 0, this.particleCountWidth, this.particleCountHeight)

          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

          gl.bindTexture(gl.TEXTURE_2D, particleTextureA)
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.particleCountWidth,
            this.particleCountHeight,
            0,
            gl.RGBA,
            gl.FLOAT,
            null
          )

          const temp = particleTextureA
          particleTextureA = particleTextureB
          particleTextureB = temp
        }
      }

      let flippedThisFrame = false //if the order reversed this frame

      const viewDirection = camera.getViewDirection()

      let halfVector

      if (dotVectors(viewDirection, LIGHT_DIRECTION) > 0.0) {
        halfVector = new Float32Array([
          LIGHT_DIRECTION[0] + viewDirection[0],
          LIGHT_DIRECTION[1] + viewDirection[1],
          LIGHT_DIRECTION[2] + viewDirection[2],
        ])
        normalizeVector(halfVector, halfVector)

        if (flipped) {
          flippedThisFrame = true
        }

        flipped = false
      } else {
        halfVector = new Float32Array([
          LIGHT_DIRECTION[0] - viewDirection[0],
          LIGHT_DIRECTION[1] - viewDirection[1],
          LIGHT_DIRECTION[2] - viewDirection[2],
        ])
        normalizeVector(halfVector, halfVector)

        if (!flipped) {
          flippedThisFrame = true
        }

        flipped = true
      }

      gl.disable(gl.DEPTH_TEST)

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0.0, 0.0, 0.0, 0.0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      for (
        let i = 0;
        i < (firstFrame ? BASE_LIFETIME / PRESIMULATION_DELTA_TIME : 1);
        ++i
      ) {
        gl.enableVertexAttribArray(0)
        gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

        gl.useProgram(simulationProgramWrapper.program)
        gl.uniform2f(
          simulationProgramWrapper.uniformLocations.u_resolution,
          this.particleCountWidth,
          this.particleCountHeight
        )
        gl.uniform1f(
          simulationProgramWrapper.uniformLocations.u_deltaTime,
          firstFrame ? PRESIMULATION_DELTA_TIME : deltaTime * this.timeScale
        )
        gl.uniform1f(
          simulationProgramWrapper.uniformLocations.u_time,
          firstFrame ? PRESIMULATION_DELTA_TIME : currentTime
        )
        gl.uniform1i(
          simulationProgramWrapper.uniformLocations.u_particleTexture,
          0
        )

        gl.uniform1f(
          simulationProgramWrapper.uniformLocations.u_persistence,
          this.persistence
        )

        gl.uniform1i(
          simulationProgramWrapper.uniformLocations.u_spawnTexture,
          1
        )

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

        //swap A and B
        const temp = particleTextureA
        particleTextureA = particleTextureB
        particleTextureB = temp

        gl.viewport(0, 0, this.particleCountWidth, this.particleCountHeight)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        if (firstFrame) gl.flush()
      }

      firstFrame = false

      gl.disable(gl.BLEND)

      gl.enableVertexAttribArray(0)
      gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

      if (flippedThisFrame) {
        //if the order reversed this frame sort everything
        sortPass = -1
        sortStage = -1
        sortStepsLeft = totalSortSteps
      }

      for (
        let i = 0;
        i < (flippedThisFrame ? totalSortSteps : SORT_PASSES_PER_FRAME);
        ++i
      ) {
        sortPass--
        if (sortPass < 0) {
          sortStage++
          sortPass = sortStage
        }

        gl.useProgram(sortProgramWrapper.program)

        gl.uniform1i(sortProgramWrapper.uniformLocations['u_dataTexture'], 0)
        gl.uniform2f(
          sortProgramWrapper.uniformLocations['u_resolution'],
          this.particleCountWidth,
          this.particleCountHeight
        )

        gl.uniform1f(sortProgramWrapper.uniformLocations['pass'], 1 << sortPass)
        gl.uniform1f(
          sortProgramWrapper.uniformLocations['stage'],
          1 << sortStage
        )

        gl.uniform3fv(
          sortProgramWrapper.uniformLocations['u_halfVector'],
          halfVector
        )

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

        gl.viewport(0, 0, this.particleCountWidth, this.particleCountHeight)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        const temp = particleTextureA
        particleTextureA = particleTextureB
        particleTextureB = temp

        sortStepsLeft--

        if (sortStepsLeft === 0) {
          sortStepsLeft = totalSortSteps
          sortPass = -1
          sortStage = -1
        }
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, opacityFramebuffer)
      gl.clearColor(0.0, 0.0, 0.0, 0.0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      for (let i = 0; i < SLICES; ++i) {
        //render particles
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, canvas.width, canvas.height)

        gl.useProgram(renderingProgramWrapper.program)

        gl.uniform1i(
          renderingProgramWrapper.uniformLocations['u_particleTexture'],
          0
        )
        gl.uniform1i(
          renderingProgramWrapper.uniformLocations['u_opacityTexture'],
          1
        )

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
          renderingProgramWrapper.uniformLocations[
            'u_lightViewProjectionMatrix'
          ],
          false,
          lightViewProjectionMatrix
        )

        gl.uniform1f(
          renderingProgramWrapper.uniformLocations['u_particleDiameter'],
          this.particleDiameter
        )
        gl.uniform1f(
          renderingProgramWrapper.uniformLocations['u_screenWidth'],
          canvas.width
        )

        gl.uniform1f(
          renderingProgramWrapper.uniformLocations['u_particleAlpha'],
          this.particleAlpha
        )

        const colorRGB = hsvToRGB(this.hue, PARTICLE_SATURATION, PARTICLE_VALUE)
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
          i * (this.particleCount / SLICES),
          this.particleCount / SLICES
        )

        //render to opacity texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, opacityFramebuffer)

        gl.viewport(
          0,
          0,
          OPACITY_TEXTURE_RESOLUTION,
          OPACITY_TEXTURE_RESOLUTION
        )

        gl.useProgram(opacityProgramWrapper.program)

        gl.uniform1i(
          opacityProgramWrapper.uniformLocations['u_particleTexture'],
          0
        )

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
          this.particleDiameter
        )
        gl.uniform1f(
          opacityProgramWrapper.uniformLocations['u_screenWidth'],
          OPACITY_TEXTURE_RESOLUTION
        )

        gl.uniform1f(
          opacityProgramWrapper.uniformLocations['u_particleAlpha'],
          this.particleAlpha
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
          i * (this.particleCount / SLICES),
          this.particleCount / SLICES
        )
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)

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

      gl.viewport(0, 0, canvas.width, canvas.height)

      gl.enableVertexAttribArray(0)
      gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

      gl.useProgram(backgroundProgramWrapper.program)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      requestAnimationFrame(render)
    }
    render()
  }

  setHue(newHue: number) {
    this.hue = newHue
  }

  setTimeScale(newTimeScale: number) {
    this.timeScale = newTimeScale
  }

  setPersistence(newPersistence: number) {
    this.persistence = newPersistence
  }

  changeQualityLevel(newLevel: number) {
    this.qualityLevel = newLevel

    this.particleAlpha = QUALITY_LEVELS[this.qualityLevel].alpha
    this.changingParticleCount = true

    this.oldParticleDiameter = this.particleDiameter
    this.particleDiameter = QUALITY_LEVELS[this.qualityLevel].diameter

    this.oldParticleCountWidth = this.particleCountWidth
    this.oldParticleCountHeight = this.particleCountHeight
    this.particleCountWidth = QUALITY_LEVELS[this.qualityLevel].resolution[0]
    this.particleCountHeight = QUALITY_LEVELS[this.qualityLevel].resolution[1]

    this.particleCount = this.particleCountWidth * this.particleCountHeight
  }
}
