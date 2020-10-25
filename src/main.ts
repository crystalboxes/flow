import Flow from './flow'
import {
  hasWebGLSupportWithExtensions,
  INITIAL_SPEED,
  INITIAL_TURBULENCE,
  MAX_SPEED,
  MAX_TURBULENCE,
  hsvToRGB,
  UI_SATURATION,
  UI_VALUE,
} from './shared'
import { Buttons, HuePicker, Slider } from './ui'

if (hasWebGLSupportWithExtensions(['OES_texture_float'])) {
  const flow = new Flow(
    (document.getElementById('render') as unknown) as HTMLCanvasElement
  )

  flow.setHue(0)
  flow.setTimeScale(INITIAL_SPEED)
  flow.setPersistence(INITIAL_TURBULENCE)

  // @ts-ignore
  const speedSlider = new Slider(
    document.getElementById('speed-slider'),
    0.0,
    MAX_SPEED,
    INITIAL_SPEED,
    function (value) {
      flow.setTimeScale(value)
    }
  )

  // @ts-ignore
  const turbulenceSlider = new Slider(
    document.getElementById('turbulence-slider'),
    0.0,
    MAX_TURBULENCE,
    INITIAL_TURBULENCE,
    function (value) {
      flow.setPersistence(value)
    }
  )

  // @ts-ignore
  const buttons = new Buttons(
    [
      document.getElementById('count-16'),
      document.getElementById('count-17'),
      document.getElementById('count-18'),
      document.getElementById('count-19'),
      document.getElementById('count-20'),
      document.getElementById('count-21'),
    ],
    function (index) {
      flow.changeQualityLevel(index)
    }
  )

  const picker = new HuePicker(
    document.getElementById('picker') as HTMLCanvasElement,
    function (value: number) {
      flow.setHue(value)

      const color = hsvToRGB(value, UI_SATURATION, UI_VALUE)
      const rgbString =
        'rgb(' +
        (color[0] * 255).toFixed(0) +
        ',' +
        (color[1] * 255).toFixed(0) +
        ',' +
        (color[2] * 255).toFixed(0) +
        ')'

      speedSlider.setColor(rgbString)
      turbulenceSlider.setColor(rgbString)

      buttons.setColor(rgbString)
    }
  )
} else {
  //@ts-ignore
  document.getElementById('gui').style.display = 'none'
  //@ts-ignore
  document.getElementById('render').style.display = 'none'
  //@ts-ignore
  document.getElementById('footer').style.display = 'none'
  //@ts-ignore
  document.getElementById('error').style.display = 'block'
}
