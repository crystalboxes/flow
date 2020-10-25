import {
  getMousePosition,
  CAMERA_SENSITIVITY,
  MIN_ELEVATION,
  MAX_ELEVATION,
  INITIAL_AZIMUTH,
  INITIAL_ELEVATION,
  CAMERA_DISTANCE,
  CAMERA_ORBIT_POINT,
  makeIdentityMatrix,
  makeXRotationMatrix,
  makeYRotationMatrix,
  premultiplyMatrix,
} from './shared'

export default class Camera {
  constructor(element: HTMLElement) {
    this.element = element

    element.addEventListener(
      'mousedown',
      (event: { clientX: number; clientY: number }) => {
        this.mouseDown = true
        this.lastMouseX = getMousePosition(event, element).x
        this.lastMouseY = getMousePosition(event, element).y
      }
    )

    document.addEventListener('mouseup', () => {
      this.mouseDown = false
    })

    element.addEventListener(
      'mousemove',
      (event: { clientX: number; clientY: number }) => {
        if (this.mouseDown) {
          const mouseX = getMousePosition(event, element).x
          const mouseY = getMousePosition(event, element).y

          const deltaAzimuth = (mouseX - this.lastMouseX) * CAMERA_SENSITIVITY
          const deltaElevation = (mouseY - this.lastMouseY) * CAMERA_SENSITIVITY

          this.azimuth += deltaAzimuth
          this.elevation += deltaElevation

          if (this.elevation < MIN_ELEVATION) {
            this.elevation = MIN_ELEVATION
          } else if (this.elevation > MAX_ELEVATION) {
            this.elevation = MAX_ELEVATION
          }

          this.recomputeViewMatrix()

          this.lastMouseX = mouseX
          this.lastMouseY = mouseY

          element.style.cursor = '-webkit-grabbing'
          element.style.cursor = '-moz-grabbing'
          element.style.cursor = 'grabbing'
        } else {
          element.style.cursor = '-webkit-grab'
          element.style.cursor = '-moz-grab'
          element.style.cursor = 'grab'
        }
      }
    )

    this.recomputeViewMatrix()
  }
  element: HTMLElement
  azimuth = INITIAL_AZIMUTH
  elevation = INITIAL_ELEVATION

  lastMouseX = 0
  lastMouseY = 0

  mouseDown = false

  viewMatrix = new Float32Array(16)

  // @ts-ignore
  getViewMatrix() {
    return this.viewMatrix
  }

  // @ts-ignore
  getPosition() {
    const cameraPosition = new Float32Array(3)
    cameraPosition[0] =
      CAMERA_DISTANCE *
        Math.sin(Math.PI / 2 - this.elevation) *
        Math.sin(-this.azimuth) +
      CAMERA_ORBIT_POINT[0]
    cameraPosition[1] =
      CAMERA_DISTANCE * Math.cos(Math.PI / 2 - this.elevation) +
      CAMERA_ORBIT_POINT[1]
    cameraPosition[2] =
      CAMERA_DISTANCE *
        Math.sin(Math.PI / 2 - this.elevation) *
        Math.cos(-this.azimuth) +
      CAMERA_ORBIT_POINT[2]

    return cameraPosition
  }

  getViewDirection() {
    const viewDirection = new Float32Array(3)
    viewDirection[0] =
      -Math.sin(Math.PI / 2 - this.elevation) * Math.sin(-this.azimuth)
    viewDirection[1] = -Math.cos(Math.PI / 2 - this.elevation)
    viewDirection[2] =
      -Math.sin(Math.PI / 2 - this.elevation) * Math.cos(-this.azimuth)

    return viewDirection
  }

  recomputeViewMatrix() {
    const xRotationMatrix = new Float32Array(16),
      yRotationMatrix = new Float32Array(16),
      distanceTranslationMatrix = makeIdentityMatrix(new Float32Array(16)),
      orbitTranslationMatrix = makeIdentityMatrix(new Float32Array(16))

    makeIdentityMatrix(this.viewMatrix)

    makeXRotationMatrix(xRotationMatrix, this.elevation)
    makeYRotationMatrix(yRotationMatrix, this.azimuth)
    distanceTranslationMatrix[14] = -CAMERA_DISTANCE
    orbitTranslationMatrix[12] = -CAMERA_ORBIT_POINT[0]
    orbitTranslationMatrix[13] = -CAMERA_ORBIT_POINT[1]
    orbitTranslationMatrix[14] = -CAMERA_ORBIT_POINT[2]

    premultiplyMatrix(this.viewMatrix, this.viewMatrix, orbitTranslationMatrix)
    premultiplyMatrix(this.viewMatrix, this.viewMatrix, yRotationMatrix)
    premultiplyMatrix(this.viewMatrix, this.viewMatrix, xRotationMatrix)
    premultiplyMatrix(
      this.viewMatrix,
      this.viewMatrix,
      distanceTranslationMatrix
    )
  }
}
