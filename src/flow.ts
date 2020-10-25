import background from './shaders/background'
import floor from './shaders/floor'
import opacity from './shaders/opacity'
import rendering from './shaders/rendering'
import resample from './shaders/resample'
import simulation from './shaders/simulation'
import soft from './shaders/soft'
import {
  FLOOR_ORIGIN,
  INITIAL_AZIMUTH,
  INITIAL_ELEVATION,
  CAMERA_DISTANCE,
  CAMERA_ORBIT_POINT,
  makeIdentityMatrix,
  makeXRotationMatrix,
  makeYRotationMatrix,
  premultiplyMatrix,
  getMousePosition,
  CAMERA_SENSITIVITY,
  MIN_ELEVATION,
  MAX_ELEVATION,
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
} from './shared'

export function Camera(element: HTMLElement) {
  var azimuth = INITIAL_AZIMUTH,
    elevation = INITIAL_ELEVATION

  var lastMouseX = 0,
    lastMouseY = 0

  var mouseDown = false

  var viewMatrix = new Float32Array(16)

  // @ts-ignore
  this.getViewMatrix = function () {
    return viewMatrix
  }

  // @ts-ignore
  this.getPosition = function () {
    var cameraPosition = new Float32Array(3)
    cameraPosition[0] =
      CAMERA_DISTANCE * Math.sin(Math.PI / 2 - elevation) * Math.sin(-azimuth) +
      CAMERA_ORBIT_POINT[0]
    cameraPosition[1] =
      CAMERA_DISTANCE * Math.cos(Math.PI / 2 - elevation) +
      CAMERA_ORBIT_POINT[1]
    cameraPosition[2] =
      CAMERA_DISTANCE * Math.sin(Math.PI / 2 - elevation) * Math.cos(-azimuth) +
      CAMERA_ORBIT_POINT[2]

    return cameraPosition
  }

  // @ts-ignore
  this.getViewDirection = function () {
    var viewDirection = new Float32Array(3)
    viewDirection[0] = -Math.sin(Math.PI / 2 - elevation) * Math.sin(-azimuth)
    viewDirection[1] = -Math.cos(Math.PI / 2 - elevation)
    viewDirection[2] = -Math.sin(Math.PI / 2 - elevation) * Math.cos(-azimuth)

    return viewDirection
  }

  var recomputeViewMatrix = function () {
    var xRotationMatrix = new Float32Array(16),
      yRotationMatrix = new Float32Array(16),
      distanceTranslationMatrix = makeIdentityMatrix(new Float32Array(16)),
      orbitTranslationMatrix = makeIdentityMatrix(new Float32Array(16))

    makeIdentityMatrix(viewMatrix)

    makeXRotationMatrix(xRotationMatrix, elevation)
    makeYRotationMatrix(yRotationMatrix, azimuth)
    distanceTranslationMatrix[14] = -CAMERA_DISTANCE
    orbitTranslationMatrix[12] = -CAMERA_ORBIT_POINT[0]
    orbitTranslationMatrix[13] = -CAMERA_ORBIT_POINT[1]
    orbitTranslationMatrix[14] = -CAMERA_ORBIT_POINT[2]

    premultiplyMatrix(viewMatrix, viewMatrix, orbitTranslationMatrix)
    premultiplyMatrix(viewMatrix, viewMatrix, yRotationMatrix)
    premultiplyMatrix(viewMatrix, viewMatrix, xRotationMatrix)
    premultiplyMatrix(viewMatrix, viewMatrix, distanceTranslationMatrix)
  }

  element.addEventListener('mousedown', function (event: {
    clientX: number
    clientY: number
  }) {
    mouseDown = true
    lastMouseX = getMousePosition(event, element).x
    lastMouseY = getMousePosition(event, element).y
  })

  document.addEventListener('mouseup', function () {
    mouseDown = false
  })

  element.addEventListener('mousemove', function (event: {
    clientX: number
    clientY: number
  }) {
    if (mouseDown) {
      var mouseX = getMousePosition(event, element).x
      var mouseY = getMousePosition(event, element).y

      var deltaAzimuth = (mouseX - lastMouseX) * CAMERA_SENSITIVITY
      var deltaElevation = (mouseY - lastMouseY) * CAMERA_SENSITIVITY

      azimuth += deltaAzimuth
      elevation += deltaElevation

      if (elevation < MIN_ELEVATION) {
        elevation = MIN_ELEVATION
      } else if (elevation > MAX_ELEVATION) {
        elevation = MAX_ELEVATION
      }

      recomputeViewMatrix()

      lastMouseX = mouseX
      lastMouseY = mouseY

      element.style.cursor = '-webkit-grabbing'
      element.style.cursor = '-moz-grabbing'
      element.style.cursor = 'grabbing'
    } else {
      element.style.cursor = '-webkit-grab'
      element.style.cursor = '-moz-grab'
      element.style.cursor = 'grab'
    }
  })

  recomputeViewMatrix()
}

export var Flow = function (canvas: HTMLCanvasElement) {
  var options = {
    premultipliedAlpha: false,
    alpha: true,
  }

  var gl = canvas.getContext('webgl', options) as WebGLRenderingContext
  if (!gl) {
    throw new Error('')
  }

  gl.getExtension('OES_texture_float')
  gl.clearColor(0.0, 0.0, 0.0, 0.0)

  var maxParticleCount =
    QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[0] *
    QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[1]

  var randomNumbers = []
  for (var i = 0; i < maxParticleCount; ++i) {
    randomNumbers[i] = Math.random()
  }

  var randomSpherePoints = []
  for (var i = 0; i < maxParticleCount; ++i) {
    var point = randomPointInSphere()
    randomSpherePoints.push(point)
  }

  var particleVertexBuffer: any
  var spawnTexture: any

  var particleVertexBuffers: any[] = [] //one for each quality level
  var spawnTextures: any[] = [] //one for each quality level

  for (var i = 0; i < QUALITY_LEVELS.length; ++i) {
    var width = QUALITY_LEVELS[i].resolution[0]
    var height = QUALITY_LEVELS[i].resolution[1]

    var count = width * height

    particleVertexBuffers[i] = gl.createBuffer()

    var particleTextureCoordinates = new Float32Array(width * height * 2)
    for (var y = 0; y < height; ++y) {
      for (var x = 0; x < width; ++x) {
        particleTextureCoordinates[(y * width + x) * 2] = (x + 0.5) / width
        particleTextureCoordinates[(y * width + x) * 2 + 1] = (y + 0.5) / height
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexBuffers[i])
    gl.bufferData(gl.ARRAY_BUFFER, particleTextureCoordinates, gl.STATIC_DRAW)

    // @ts-ignore
    // delete particleTextureCoordinates

    var spawnData = new Float32Array(count * 4)
    for (var j = 0; j < count; ++j) {
      var position = randomSpherePoints[j]

      var positionX = position[0] * SPAWN_RADIUS
      var positionY = position[1] * SPAWN_RADIUS
      var positionZ = position[2] * SPAWN_RADIUS
      var lifetime = BASE_LIFETIME + randomNumbers[j] * MAX_ADDITIONAL_LIFETIME

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

  var offsetData = new Float32Array(maxParticleCount * 4)
  for (var i = 0; i < maxParticleCount; ++i) {
    var position = randomSpherePoints[i]

    var positionX = position[0] * OFFSET_RADIUS
    var positionY = position[1] * OFFSET_RADIUS
    var positionZ = position[2] * OFFSET_RADIUS

    offsetData[i * 4] = positionX
    offsetData[i * 4 + 1] = positionY
    offsetData[i * 4 + 2] = positionZ
    offsetData[i * 4 + 3] = 0.0
  }

  var offsetTexture = buildTexture(
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

  //@ts-ignore
  //   delete randomNumbers
  //@ts-ignore
  //   delete randomSpherePoints
  //@ts-ignore
  //   delete offsetData

  var particleCountWidth = 0
  var particleCountHeight = 0
  var particleCount = particleCountWidth * particleCountHeight

  var particleDiameter = 0.0
  var particleAlpha = 0.0

  var changingParticleCount = false
  var oldParticleDiameter: number
  var oldParticleCountWidth: number
  var oldParticleCountHeight: number

  var particleTextureA = buildTexture(
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
  var particleTextureB = buildTexture(
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

  // @ts-ignore
  var camera = new Camera(canvas)

  var projectionMatrix = makePerspectiveMatrix(
    new Float32Array(16),
    PROJECTION_FOV,
    ASPECT_RATIO,
    PROJECTION_NEAR,
    PROJECTION_FAR
  )

  var lightViewMatrix = new Float32Array(16)
  makeLookAtMatrix(
    lightViewMatrix,
    [0.0, 0.0, 0.0],
    LIGHT_DIRECTION,
    LIGHT_UP_VECTOR
  )
  var lightProjectionMatrix = makeOrthographicMatrix(
    new Float32Array(16),
    LIGHT_PROJECTION_LEFT,
    LIGHT_PROJECTION_RIGHT,
    LIGHT_PROJECTION_BOTTOM,
    LIGHT_PROJECTION_TOP,
    LIGHT_PROJECTION_NEAR,
    LIGHT_PROJECTION_FAR
  )

  var lightViewProjectionMatrix = new Float32Array(16)
  premultiplyMatrix(
    lightViewProjectionMatrix,
    lightViewMatrix,
    lightProjectionMatrix
  )

  var hue = 0
  var timeScale = INITIAL_SPEED
  var persistence = INITIAL_TURBULENCE

  // @ts-ignore
  this.setHue = function (newHue: number) {
    hue = newHue
  }

  // @ts-ignore
  this.setTimeScale = function (newTimeScale: number) {
    timeScale = newTimeScale
  }

  // @ts-ignore
  this.setPersistence = function (newPersistence: number) {
    persistence = newPersistence
  }

  var resampleFramebuffer = gl.createFramebuffer()

  var qualityLevel = -1

  // @ts-ignore
  this.changeQualityLevel = function (newLevel: number) {
    qualityLevel = newLevel

    particleAlpha = QUALITY_LEVELS[qualityLevel].alpha
    changingParticleCount = true

    oldParticleDiameter = particleDiameter
    particleDiameter = QUALITY_LEVELS[qualityLevel].diameter

    oldParticleCountWidth = particleCountWidth
    oldParticleCountHeight = particleCountHeight
    particleCountWidth = QUALITY_LEVELS[qualityLevel].resolution[0]
    particleCountHeight = QUALITY_LEVELS[qualityLevel].resolution[1]

    particleCount = particleCountWidth * particleCountHeight
  }

  //@ts-ignore
  this.changeQualityLevel(0)

  //variables used for sorting
  var totalSortSteps = (log2(particleCount) * (log2(particleCount) + 1)) / 2
  var sortStepsLeft = totalSortSteps
  var sortPass = -1
  var sortStage = -1

  var opacityTexture = buildTexture(
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

  var simulationFramebuffer = gl.createFramebuffer()
  var sortFramebuffer = gl.createFramebuffer()

  var opacityFramebuffer = buildFramebuffer(gl, opacityTexture)

  var simulationProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, simulation.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, simulation.fragment),
    { a_position: 0 }
  )

  var renderingProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, rendering.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, rendering.fragment),
    { a_textureCoordinates: 0 }
  )

  var opacityProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, opacity.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, opacity.fragment),
    { a_textureCoordinates: 0 }
  )

  var sortProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, soft.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, soft.fragment),
    { a_position: 0 }
  )

  var resampleProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, resample.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, resample.fragment),
    { a_position: 0 }
  )

  var floorProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, floor.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, floor.fragment),
    { a_vertexPosition: 0 }
  )

  var backgroundProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, background.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, background.fragment),
    { a_position: 0 }
  )

  var fullscreenVertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
    gl.STATIC_DRAW
  )

  var floorVertexBuffer = gl.createBuffer()
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

  var onresize = function () {
    var aspectRatio = window.innerWidth / window.innerHeight
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

  var firstFrame = true

  var flipped = false

  var lastTime = 0.0
  var render = function render(currentTime?: number) {
    // if (!currentTime) {
    //   throw new Error('')
    // }
    if (!currentTime) {
      currentTime = 0
    }
    var deltaTime = (currentTime - lastTime) / 1000 || 0.0
    lastTime = currentTime

    if (deltaTime > MAX_DELTA_TIME) {
      deltaTime = 0
    }

    if (changingParticleCount) {
      deltaTime = 0
      changingParticleCount = false

      particleVertexBuffer = particleVertexBuffers[qualityLevel]
      spawnTexture = spawnTextures[qualityLevel]

      //reset sort
      totalSortSteps = (log2(particleCount) * (log2(particleCount) + 1)) / 2
      sortStepsLeft = totalSortSteps
      sortPass = -1
      sortStage = -1

      if (oldParticleCountHeight === 0 && oldParticleCountWidth === 0) {
        //initial generation
        var particleData = new Float32Array(particleCount * 4)

        for (var i = 0; i < particleCount; ++i) {
          var position = randomPointInSphere()

          var positionX = position[0] * SPAWN_RADIUS
          var positionY = position[1] * SPAWN_RADIUS
          var positionZ = position[2] * SPAWN_RADIUS

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

        // @ts-ignore
        // delete particleData

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
      } else {
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
        gl.uniform1i(
          resampleProgramWrapper.uniformLocations['u_particleTexture'],
          0
        )
        gl.uniform1i(
          resampleProgramWrapper.uniformLocations['u_offsetTexture'],
          1
        )

        if (particleCount > oldParticleCountWidth * oldParticleCountHeight) {
          //if we are upsampling we need to add random sphere offsets
          gl.uniform1f(
            resampleProgramWrapper.uniformLocations['u_offsetScale'],
            oldParticleDiameter
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

        var temp = particleTextureA
        particleTextureA = particleTextureB
        particleTextureB = temp
      }
    }

    var flippedThisFrame = false //if the order reversed this frame

    var viewDirection = camera.getViewDirection()

    var halfVector

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
      var i = 0;
      i < (firstFrame ? BASE_LIFETIME / PRESIMULATION_DELTA_TIME : 1);
      ++i
    ) {
      gl.enableVertexAttribArray(0)
      gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

      gl.useProgram(simulationProgramWrapper.program)
      gl.uniform2f(
        simulationProgramWrapper.uniformLocations['u_resolution'],
        particleCountWidth,
        particleCountHeight
      )
      gl.uniform1f(
        simulationProgramWrapper.uniformLocations['u_deltaTime'],
        firstFrame ? PRESIMULATION_DELTA_TIME : deltaTime * timeScale
      )
      gl.uniform1f(
        simulationProgramWrapper.uniformLocations['u_time'],
        firstFrame ? PRESIMULATION_DELTA_TIME : currentTime
      )
      gl.uniform1i(
        simulationProgramWrapper.uniformLocations['u_particleTexture'],
        0
      )

      gl.uniform1f(
        simulationProgramWrapper.uniformLocations['u_persistence'],
        persistence
      )

      gl.uniform1i(
        simulationProgramWrapper.uniformLocations['u_spawnTexture'],
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
      var temp = particleTextureA
      particleTextureA = particleTextureB
      particleTextureB = temp

      gl.viewport(0, 0, particleCountWidth, particleCountHeight)

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
      var i = 0;
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
        particleCountWidth,
        particleCountHeight
      )

      gl.uniform1f(sortProgramWrapper.uniformLocations['pass'], 1 << sortPass)
      gl.uniform1f(sortProgramWrapper.uniformLocations['stage'], 1 << sortStage)

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

      gl.viewport(0, 0, particleCountWidth, particleCountHeight)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      var temp = particleTextureA
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

    for (var i = 0; i < SLICES; ++i) {
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
        renderingProgramWrapper.uniformLocations['u_lightViewProjectionMatrix'],
        false,
        lightViewProjectionMatrix
      )

      gl.uniform1f(
        renderingProgramWrapper.uniformLocations['u_particleDiameter'],
        particleDiameter
      )
      gl.uniform1f(
        renderingProgramWrapper.uniformLocations['u_screenWidth'],
        canvas.width
      )

      gl.uniform1f(
        renderingProgramWrapper.uniformLocations['u_particleAlpha'],
        particleAlpha
      )

      var colorRGB = hsvToRGB(hue, PARTICLE_SATURATION, PARTICLE_VALUE)
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
        i * (particleCount / SLICES),
        particleCount / SLICES
      )

      //render to opacity texture
      gl.bindFramebuffer(gl.FRAMEBUFFER, opacityFramebuffer)

      gl.viewport(0, 0, OPACITY_TEXTURE_RESOLUTION, OPACITY_TEXTURE_RESOLUTION)

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
        i * (particleCount / SLICES),
        particleCount / SLICES
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
