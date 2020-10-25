export const MAX_DELTA_TIME = 0.2

export const PRESIMULATION_DELTA_TIME = 0.1

export const QUALITY_LEVELS = [
  {
    resolution: [256, 256],
    diameter: 0.03,
    alpha: 0.5,
  },
  {
    resolution: [512, 256],
    diameter: 0.025,
    alpha: 0.4,
  },
  {
    resolution: [512, 512],
    diameter: 0.02,
    alpha: 0.3,
  },
  {
    resolution: [1024, 512],
    diameter: 0.015,
    alpha: 0.25,
  },
  {
    resolution: [1024, 1024],
    diameter: 0.0125,
    alpha: 0.2,
  },
  {
    resolution: [2048, 1024],
    diameter: 0.01,
    alpha: 0.2,
  },
]

export const OPACITY_TEXTURE_RESOLUTION = 1024

export const LIGHT_DIRECTION = [0.0, -1.0, 0.0] //points away from the light source
export const LIGHT_UP_VECTOR = [0.0, 0.0, 1.0]

export const SLICES = 128

export const SORT_PASSES_PER_FRAME = 50

export const NOISE_OCTAVES = 3
export const NOISE_POSITION_SCALE = 1.5
export const NOISE_SCALE = 0.075
export const NOISE_TIME_SCALE = 1 / 4000
export const BASE_SPEED = 0.2

export const PARTICLE_SATURATION = 0.75
export const PARTICLE_VALUE = 1.0
export const PARTICLE_OPACITY_SCALE = 0.75

export const BACKGROUND_DISTANCE_SCALE = 0.1

export const FLOOR_WIDTH = 100.0
export const FLOOR_HEIGHT = 100.0
export const FLOOR_ORIGIN = [-2.0, -0.75, -5.0]

export const ASPECT_RATIO = 16 / 9

export const PROJECTION_NEAR = 0.01
export const PROJECTION_FAR = 10.0

export const PROJECTION_FOV = (60 / 180) * Math.PI

export const LIGHT_PROJECTION_LEFT = -5.0
export const LIGHT_PROJECTION_RIGHT = 5.0
export const LIGHT_PROJECTION_BOTTOM = -5.0
export const LIGHT_PROJECTION_TOP = 5.0
export const LIGHT_PROJECTION_NEAR = -50.0
export const LIGHT_PROJECTION_FAR = 50.0

export const SPAWN_RADIUS = 0.1
export const BASE_LIFETIME = 10
export const MAX_ADDITIONAL_LIFETIME = 5
export const OFFSET_RADIUS = 0.5

export const CAMERA_DISTANCE = 2.2
export const INITIAL_AZIMUTH = 0.6
export const INITIAL_ELEVATION = 0.4

export const MIN_ELEVATION = -0.1
export const MAX_ELEVATION = Math.PI / 2.0

export const CAMERA_ORBIT_POINT = [1.2, -0.3, 0.0]

export const CAMERA_SENSITIVITY = 0.005

export const INITIAL_SPEED = 2
export const INITIAL_TURBULENCE = 0.2

export const MAX_SPEED = 5
export const MAX_TURBULENCE = 0.5

export const HUE_INNER_RADIUS = 40
export const HUE_OUTER_RADIUS = 70

export const UI_SATURATION = 0.75
export const UI_VALUE = 0.75

export const BUTTON_ACTIVE_COLOR = 'white'
export const BUTTON_COLOR = '#333333'
export const BUTTON_BACKGROUND = '#bbbbbb'

export const HUE_HIGHLIGHTER_ANGLE_OFFSET = 0.2
export const HUE_HIGHLIGHTER_RADIUS_OFFSET = 2

export const HUE_PICKER_SATURATION = 0.75
export const HUE_PICKER_VALUE = 1.0

export const HUE_HIGHLIGHTER_SATURATION = 1
export const HUE_HIGHLIGHTER_VALUE = 0.75

export const HUE_HIGHLIGHTER_LINE_WIDTH = 5

export function hasWebGLSupportWithExtensions(extensions: string[]) {
  var canvas = document.createElement('canvas')
  var gl = null
  try {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  } catch (e) {
    return false
  }
  if (gl === null) {
    return false
  }

  for (var i = 0; i < extensions.length; ++i) {
    // @ts-ignore
    if (gl.getExtension(extensions[i]) === null) {
      return false
    }
  }

  return true
}

export function buildProgramWrapper(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
  attributeLocations: { [index: string]: number }
) {
  var programWrapper: { [index: string]: any } = {}

  var program = gl.createProgram()
  if (!program) {
    throw new Error('')
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  for (var attributeName in attributeLocations) {
    gl.bindAttribLocation(
      program,
      attributeLocations[attributeName],
      attributeName
    )
  }
  gl.linkProgram(program)
  var uniformLocations: { [index: string]: WebGLUniformLocation } = {}
  var numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  for (var i = 0; i < numberOfUniforms; i += 1) {
    const activeUniform = gl.getActiveUniform(program, i)
    const uniformLocation = gl.getUniformLocation(
      program,
      activeUniform?.name || ''
    )
    if (uniformLocation) {
      uniformLocations[activeUniform?.name || ''] = uniformLocation
    }
  }

  programWrapper.program = program
  programWrapper.uniformLocations = uniformLocations

  return programWrapper
}

export const buildShader = function (
  gl: WebGLRenderingContext,
  type: number,
  source: string
) {
  var shader = gl.createShader(type)
  if (!shader) {
    throw new Error('')
  }
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  //console.log(gl.getShaderInfoLog(shader));
  return shader
}

export const buildTexture = function (
  gl: WebGLRenderingContext,
  unit: number,
  format: number,
  type: number,
  width: number,
  height: number,
  data: ArrayBufferView | null,
  wrapS: number,
  wrapT: number,
  minFilter: number,
  magFilter: number
) {
  var texture = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, data)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter)
  return texture
}

export const buildFramebuffer = function (
  gl: {
    createFramebuffer: () => any
    bindFramebuffer: (arg0: any, arg1: any) => void
    FRAMEBUFFER: any
    framebufferTexture2D: (
      arg0: any,
      arg1: any,
      arg2: any,
      arg3: any,
      arg4: number
    ) => void
    COLOR_ATTACHMENT0: any
    TEXTURE_2D: any
  },
  attachment: any
) {
  var framebuffer = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    attachment,
    0
  )
  return framebuffer
}

export const normalizeVector = function (
  out: number[] | Float32Array,
  v: number[] | Float32Array
) {
  var inverseMagnitude =
    1.0 / Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
  out[0] = v[0] * inverseMagnitude
  out[1] = v[1] * inverseMagnitude
  out[2] = v[2] * inverseMagnitude
}

export const dotVectors = function (a: number[], b: number[]) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export const makeIdentityMatrix = function (matrix: Float32Array | number[]) {
  matrix[0] = 1.0
  matrix[1] = 0.0
  matrix[2] = 0.0
  matrix[3] = 0.0
  matrix[4] = 0.0
  matrix[5] = 1.0
  matrix[6] = 0.0
  matrix[7] = 0.0
  matrix[8] = 0.0
  matrix[9] = 0.0
  matrix[10] = 1.0
  matrix[11] = 0.0
  matrix[12] = 0.0
  matrix[13] = 0.0
  matrix[14] = 0.0
  matrix[15] = 1.0
  return matrix
}

export const premultiplyMatrix = function (
  out: number[] | Float32Array,
  matrixA: any[] | Float32Array,
  matrixB: any[] | Float32Array
) {
  //out = matrixB * matrixA
  var b0 = matrixB[0],
    b4 = matrixB[4],
    b8 = matrixB[8],
    b12 = matrixB[12],
    b1 = matrixB[1],
    b5 = matrixB[5],
    b9 = matrixB[9],
    b13 = matrixB[13],
    b2 = matrixB[2],
    b6 = matrixB[6],
    b10 = matrixB[10],
    b14 = matrixB[14],
    b3 = matrixB[3],
    b7 = matrixB[7],
    b11 = matrixB[11],
    b15 = matrixB[15],
    aX = matrixA[0],
    aY = matrixA[1],
    aZ = matrixA[2],
    aW = matrixA[3]
  out[0] = b0 * aX + b4 * aY + b8 * aZ + b12 * aW
  out[1] = b1 * aX + b5 * aY + b9 * aZ + b13 * aW
  out[2] = b2 * aX + b6 * aY + b10 * aZ + b14 * aW
  out[3] = b3 * aX + b7 * aY + b11 * aZ + b15 * aW

  aX = matrixA[4]
  aY = matrixA[5]
  aZ = matrixA[6]
  aW = matrixA[7]

  out[4] = b0 * aX + b4 * aY + b8 * aZ + b12 * aW
  out[5] = b1 * aX + b5 * aY + b9 * aZ + b13 * aW
  out[6] = b2 * aX + b6 * aY + b10 * aZ + b14 * aW
  out[7] = b3 * aX + b7 * aY + b11 * aZ + b15 * aW

  aX = matrixA[8]
  aY = matrixA[9]
  aZ = matrixA[10]
  aW = matrixA[11]

  out[8] = b0 * aX + b4 * aY + b8 * aZ + b12 * aW
  out[9] = b1 * aX + b5 * aY + b9 * aZ + b13 * aW
  out[10] = b2 * aX + b6 * aY + b10 * aZ + b14 * aW
  out[11] = b3 * aX + b7 * aY + b11 * aZ + b15 * aW

  aX = matrixA[12]
  aY = matrixA[13]
  aZ = matrixA[14]
  aW = matrixA[15]

  out[12] = b0 * aX + b4 * aY + b8 * aZ + b12 * aW
  out[13] = b1 * aX + b5 * aY + b9 * aZ + b13 * aW
  out[14] = b2 * aX + b6 * aY + b10 * aZ + b14 * aW
  out[15] = b3 * aX + b7 * aY + b11 * aZ + b15 * aW

  return out
}

export const makeXRotationMatrix = function (
  matrix: Float32Array | number[],
  angle: number
) {
  matrix[0] = 1.0
  matrix[1] = 0.0
  matrix[2] = 0.0
  matrix[3] = 0.0
  matrix[4] = 0.0
  matrix[5] = Math.cos(angle)
  matrix[6] = Math.sin(angle)
  matrix[7] = 0.0
  matrix[8] = 0.0
  matrix[9] = -Math.sin(angle)
  matrix[10] = Math.cos(angle)
  matrix[11] = 0.0
  matrix[12] = 0.0
  matrix[13] = 0.0
  matrix[14] = 0.0
  matrix[15] = 1.0
  return matrix
}

export const makeYRotationMatrix = function (
  matrix: Float32Array | number[],
  angle: number
) {
  matrix[0] = Math.cos(angle)
  matrix[1] = 0.0
  matrix[2] = -Math.sin(angle)
  matrix[3] = 0.0
  matrix[4] = 0.0
  matrix[5] = 1.0
  matrix[6] = 0.0
  matrix[7] = 0.0
  matrix[8] = Math.sin(angle)
  matrix[9] = 0.0
  matrix[10] = Math.cos(angle)
  matrix[11] = 0.0
  matrix[12] = 0.0
  matrix[13] = 0.0
  matrix[14] = 0.0
  matrix[15] = 1.0
  return matrix
}

export const makePerspectiveMatrix = function (
  matrix: number[] | Float32Array,
  fov: number,
  aspect: number,
  near: number,
  far: number
) {
  var f = Math.tan(0.5 * (Math.PI - fov)),
    range = near - far

  matrix[0] = f / aspect
  matrix[1] = 0
  matrix[2] = 0
  matrix[3] = 0
  matrix[4] = 0
  matrix[5] = f
  matrix[6] = 0
  matrix[7] = 0
  matrix[8] = 0
  matrix[9] = 0
  matrix[10] = far / range
  matrix[11] = -1
  matrix[12] = 0
  matrix[13] = 0
  matrix[14] = (near * far) / range
  matrix[15] = 0.0

  return matrix
}

export const makeOrthographicMatrix = function (
  matrix: number[] | Float32Array,
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number
) {
  matrix[0] = 2 / (right - left)
  matrix[1] = 0
  matrix[2] = 0
  matrix[3] = 0
  matrix[4] = 0
  matrix[5] = 2 / (top - bottom)
  matrix[6] = 0
  matrix[7] = 0
  matrix[8] = 0
  matrix[9] = 0
  matrix[10] = -2 / (far - near)
  matrix[11] = 0
  matrix[12] = -(right + left) / (right - left)
  matrix[13] = -(top + bottom) / (top - bottom)
  matrix[14] = -(far + near) / (far - near)
  matrix[15] = 1

  return matrix
}

export const makeLookAtMatrix = function (
  matrix: number[] | Float32Array,
  eye: number[],
  target: number[],
  up: number[]
) {
  //up is assumed to be normalized
  var forwardX = eye[0] - target[0],
    forwardY = eye[1] - target[1],
    forwardZ = eye[2] - target[2]
  var forwardMagnitude = Math.sqrt(
    forwardX * forwardX + forwardY * forwardY + forwardZ * forwardZ
  )
  forwardX /= forwardMagnitude
  forwardY /= forwardMagnitude
  forwardZ /= forwardMagnitude

  var rightX = up[2] * forwardY - up[1] * forwardZ
  var rightY = up[0] * forwardZ - up[2] * forwardX
  var rightZ = up[1] * forwardX - up[0] * forwardY

  var rightMagnitude = Math.sqrt(
    rightX * rightX + rightY * rightY + rightZ * rightZ
  )
  rightX /= rightMagnitude
  rightY /= rightMagnitude
  rightZ /= rightMagnitude

  var newUpX = forwardY * rightZ - forwardZ * rightY
  var newUpY = forwardZ * rightX - forwardX * rightZ
  var newUpZ = forwardX * rightY - forwardY * rightX

  var newUpMagnitude = Math.sqrt(
    newUpX * newUpX + newUpY * newUpY + newUpZ * newUpZ
  )
  newUpX /= newUpMagnitude
  newUpY /= newUpMagnitude
  newUpZ /= newUpMagnitude

  matrix[0] = rightX
  matrix[1] = newUpX
  matrix[2] = forwardX
  matrix[3] = 0
  matrix[4] = rightY
  matrix[5] = newUpY
  matrix[6] = forwardY
  matrix[7] = 0
  matrix[8] = rightZ
  matrix[9] = newUpZ
  matrix[10] = forwardZ
  matrix[11] = 0
  matrix[12] = -(rightX * eye[0] + rightY * eye[1] + rightZ * eye[2])
  matrix[13] = -(newUpX * eye[0] + newUpY * eye[1] + newUpZ * eye[2])
  matrix[14] = -(forwardX * eye[0] + forwardY * eye[1] + forwardZ * eye[2])
  matrix[15] = 1
}

export const randomPointInSphere = function () {
  var lambda = Math.random()
  var u = Math.random() * 2.0 - 1.0
  var phi = Math.random() * 2.0 * Math.PI

  return [
    Math.pow(lambda, 1 / 3) * Math.sqrt(1.0 - u * u) * Math.cos(phi),
    Math.pow(lambda, 1 / 3) * Math.sqrt(1.0 - u * u) * Math.sin(phi),
    Math.pow(lambda, 1 / 3) * u,
  ]
}

export const log2 = function (x: number) {
  return Math.log(x) / Math.log(2)
}

export const getMousePosition = function (
  event: { clientX: number; clientY: number },
  element: { getBoundingClientRect: () => any }
) {
  var boundingRect = element.getBoundingClientRect()
  return {
    x: event.clientX - boundingRect.left,
    y: event.clientY - boundingRect.top,
  }
}

export const hsvToRGB = function (h: number, s: number, v: number) {
  h = h % 1

  var c = v * s

  var hDash = h * 6

  var x = c * (1 - Math.abs((hDash % 2) - 1))

  var mod = Math.floor(hDash)

  var r = [c, x, 0, 0, x, c][mod]
  var g = [x, c, c, x, 0, 0][mod]
  var b = [0, 0, x, c, c, x][mod]

  var m = v - c

  r += m
  g += m
  b += m

  return [r, g, b]
}

export const rgbToString = function (color: number[]) {
  return (
    'rgb(' +
    (color[0] * 255).toFixed(0) +
    ',' +
    (color[1] * 255).toFixed(0) +
    ',' +
    (color[2] * 255).toFixed(0) +
    ')'
  )
}
