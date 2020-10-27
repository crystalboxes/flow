import Flow from './flow'
import {
  hasWebGLSupportWithExtensions,
  INITIAL_SPEED,
  INITIAL_TURBULENCE,
} from './shared'
import { createUI } from './ui'

if (hasWebGLSupportWithExtensions(['OES_texture_float'])) {
  const flow = new Flow(
    (document.getElementById('render') as unknown) as HTMLCanvasElement
  )

  flow.setHue(0)
  flow.setTimeScale(INITIAL_SPEED)
  flow.setPersistence(INITIAL_TURBULENCE)

  createUI(flow)
}
