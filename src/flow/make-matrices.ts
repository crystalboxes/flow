import {
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
  premultiplyMatrix,
} from '../shared'

export default function makeMatrices() {
  const projectionMatrix = makePerspectiveMatrix(
    new Float32Array(16),
    PROJECTION_FOV,
    ASPECT_RATIO,
    PROJECTION_NEAR,
    PROJECTION_FAR
  )

  const lightViewMatrix = new Float32Array(16)
  makeLookAtMatrix(
    lightViewMatrix,
    [0.0, 0.0, 0.0],
    LIGHT_DIRECTION,
    LIGHT_UP_VECTOR
  )
  const lightProjectionMatrix = makeOrthographicMatrix(
    new Float32Array(16),
    LIGHT_PROJECTION_LEFT,
    LIGHT_PROJECTION_RIGHT,
    LIGHT_PROJECTION_BOTTOM,
    LIGHT_PROJECTION_TOP,
    LIGHT_PROJECTION_NEAR,
    LIGHT_PROJECTION_FAR
  )

  const lightViewProjectionMatrix = new Float32Array(16)
  premultiplyMatrix(
    lightViewProjectionMatrix,
    lightViewMatrix,
    lightProjectionMatrix
  )

  return {
    projectionMatrix,
    lightViewMatrix,
    lightProjectionMatrix,
    lightViewProjectionMatrix,
  }
}
