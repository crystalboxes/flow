import {
  simulation,
  rendering,
  opacity,
  soft,
  resample,
  floor,
  background,
} from '../shaders'
import { SimulationShader } from '../shaders/simulation'
import { buildProgramWrapper, buildShader } from '../shared'

export default function buildShaderPrograms(gl: WebGLRenderingContext) {
  const simulationProgramWrapper = buildProgramWrapper<SimulationShader>(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, simulation.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, simulation.fragment),
    { a_position: 0 }
  )

  const renderingProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, rendering.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, rendering.fragment),
    { a_textureCoordinates: 0 }
  )

  const opacityProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, opacity.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, opacity.fragment),
    { a_textureCoordinates: 0 }
  )

  const sortProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, soft.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, soft.fragment),
    { a_position: 0 }
  )

  const resampleProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, resample.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, resample.fragment),
    { a_position: 0 }
  )

  const floorProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, floor.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, floor.fragment),
    { a_vertexPosition: 0 }
  )

  const backgroundProgramWrapper = buildProgramWrapper(
    gl,
    buildShader(gl, gl.VERTEX_SHADER, background.vertex),
    buildShader(gl, gl.FRAGMENT_SHADER, background.fragment),
    { a_position: 0 }
  )

  return {
    simulationProgramWrapper,
    renderingProgramWrapper,
    opacityProgramWrapper,
    sortProgramWrapper,
    resampleProgramWrapper,
    floorProgramWrapper,
    backgroundProgramWrapper,
  }
}
