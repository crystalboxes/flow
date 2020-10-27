import Camera from '../camera'
import {
  QUALITY_LEVELS,
  randomPointInSphere,
  BASE_LIFETIME,
  makePerspectiveMatrix,
  PROJECTION_FOV,
  PROJECTION_NEAR,
  PROJECTION_FAR,
  LIGHT_DIRECTION,
  INITIAL_SPEED,
  INITIAL_TURBULENCE,
  log2,
  MAX_DELTA_TIME,
  dotVectors,
  normalizeVector,
  PRESIMULATION_DELTA_TIME,
  SORT_PASSES_PER_FRAME,
  SLICES,
} from '../shared'
import buildShaderPrograms from './build-shader-programs'
import makeMatrices from './make-matrices'
import makeParticleVertexBuffer, {
  renderToOpacityTexture,
} from './particle-vertex-buffer'
import { makeParticleData, resampleTextures } from './particles-initialization'
import {
  doSimulationStep,
  doSortPass,
  renderBackground,
  renderParticles,
} from './passes'
import { createTextureResources } from './texture-resources'

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

    this.oldParticleDiameter = 0
    this.oldParticleCountWidth = 0
    this.oldParticleCountHeight = 0

    const gl = canvas.getContext('webgl', options) as WebGLRenderingContext
    if (!gl) {
      throw new Error('')
    }

    gl.getExtension('OES_texture_float')
    gl.clearColor(0.0, 0.0, 0.0, 0.0)

    const maxParticleCount =
      QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[0] *
      QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[1]

    const randomSpherePoints: [number, number, number][] = []
    for (let i = 0; i < maxParticleCount; ++i) {
      const point = randomPointInSphere()
      randomSpherePoints.push(point)
    }

    let particleVertexBuffer: WebGLBuffer
    let spawnTexture: WebGLTexture

    const {
      spawnTextures,
      particleVertexBuffers,
      offsetTexture,
    } = makeParticleVertexBuffer(gl, maxParticleCount, randomSpherePoints)

    this.particleCount = this.particleCountWidth * this.particleCountHeight
    this.changeQualityLevel(0)

    const camera = new Camera(canvas)

    const {
      projectionMatrix,
      lightViewMatrix,
      lightProjectionMatrix,
      lightViewProjectionMatrix,
    } = makeMatrices()

    const {
      simulationProgramWrapper,
      renderingProgramWrapper,
      opacityProgramWrapper,
      sortProgramWrapper,
      resampleProgramWrapper,
      floorProgramWrapper,
      backgroundProgramWrapper,
    } = buildShaderPrograms(gl)

    let {
      particleTextureA,
      particleTextureB,
      opacityTexture,
      opacityFramebuffer,
      simulationFramebuffer,
      sortFramebuffer,
      resampleFramebuffer,
      fullscreenVertexBuffer,
      floorVertexBuffer,
    } = createTextureResources(gl)

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

    //variables used for sorting
    let totalSortSteps =
      (log2(this.particleCount) * (log2(this.particleCount) + 1)) / 2
    let sortStepsLeft = totalSortSteps
    let sortPass = -1
    let sortStage = -1

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
          resampleTextures({
            gl,
            particleTextureA,
            particleTextureB,
            particleCountWidth: this.particleCountWidth,
            particleCountHeight: this.particleCountHeight,
            fullscreenVertexBuffer,
            resampleProgramWrapper,
            particleCount: this.particleCount,
            oldParticleCountWidth: this.oldParticleCountWidth,
            oldParticleCountHeight: this.oldParticleCountHeight,
            oldParticleDiameter: this.oldParticleDiameter,
            offsetTexture,
            resampleFramebuffer,
          })

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
      const simulationDeltaTime = firstFrame
        ? PRESIMULATION_DELTA_TIME
        : deltaTime * this.timeScale
      const simulationTime = firstFrame ? PRESIMULATION_DELTA_TIME : currentTime

      for (
        let i = 0;
        i < (firstFrame ? BASE_LIFETIME / PRESIMULATION_DELTA_TIME : 1);
        ++i
      ) {
        doSimulationStep(
          gl,
          this.particleCountWidth,
          this.particleCountHeight,
          this.persistence,
          fullscreenVertexBuffer,
          simulationProgramWrapper,
          simulationTime,
          simulationDeltaTime,
          spawnTexture,
          particleTextureA,
          particleTextureB,
          simulationFramebuffer
        )

        if (firstFrame) gl.flush()
        //swap A and B
        const temp = particleTextureA
        particleTextureA = particleTextureB
        particleTextureB = temp
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
        doSortPass(
          gl,
          sortProgramWrapper,
          this.particleCountWidth,
          this.particleCountHeight,
          sortPass,
          sortStage,
          halfVector,
          sortFramebuffer,
          particleTextureA,
          particleTextureB
        )

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

      for (let sliceNum = 0; sliceNum < SLICES; ++sliceNum) {
        renderParticles({
          gl,
          width: canvas.width,
          height: canvas.height,
          renderingProgramWrapper,
          camera,
          projectionMatrix: projectionMatrix,
          lightViewProjectionMatrix: lightViewProjectionMatrix,
          particleDiameter: this.particleDiameter,
          particleAlpha: this.particleAlpha,
          hue: this.hue,
          particleTextureA: particleTextureA,
          opacityTexture: opacityTexture,
          particleVertexBuffer: particleVertexBuffer,
          flipped: flipped,
          sliceNum: sliceNum,
          particleCount: this.particleCount,
        })

        renderToOpacityTexture({
          gl,
          opacityFramebuffer,
          opacityProgramWrapper,
          lightViewMatrix,
          lightProjectionMatrix,
          particleDiameter: this.particleDiameter,
          particleAlpha: this.particleAlpha,
          particleTextureA,
          particleVertexBuffer,
          sliceNum,
          particleCount: this.particleCount,
        })
      }

      renderBackground({
        gl,
        width: canvas.width,
        height: canvas.height,
        floorProgramWrapper,
        floorVertexBuffer,
        camera,
        projectionMatrix,
        lightViewProjectionMatrix,
        opacityTexture,
        backgroundProgramWrapper,
        fullscreenVertexBuffer,
      })

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
