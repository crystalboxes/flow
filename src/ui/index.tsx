import { h, createApp, defineComponent, ref } from 'vue'
import Flow from '../flow'
import {
  hsvToRGB,
  INITIAL_SPEED,
  INITIAL_TURBULENCE,
  MAX_SPEED,
  MAX_TURBULENCE,
  UI_SATURATION,
  UI_VALUE,
} from '../shared'
import Buttons from './buttons'
import HuePicker from './hue-picker'
import Slider from './slider'

const Gui = defineComponent({
  props: {
    flow: { type: Flow, required: true },
  },
  setup() {
    const color = ref('orange')
    const setColor = (newColor: string) => (color.value = newColor)

    return { color, setColor }
  },
  render({
    color,
    setColor,
  }: {
    color: string
    setColor: (newColor: string) => void
  }) {
    const flow = this.flow
    return (
      <>
        <Buttons color={color} flow={flow} />

        <Slider
          color={color}
          min={0}
          max={MAX_SPEED}
          value={INITIAL_SPEED}
          onChangeCallback={(value: number) => flow.setTimeScale(value)}
        >
          {() => 'SPEED'}
        </Slider>

        <Slider
          color={color}
          min={0}
          max={MAX_TURBULENCE}
          value={INITIAL_TURBULENCE}
          onChangeCallback={(value: number) => flow.setPersistence(value)}
        >
          {() => 'TURBULENCE'}
        </Slider>

        <HuePicker
          onChangeCallback={(hue: number) => {
            flow.setHue(hue)
            const color = hsvToRGB(hue, UI_SATURATION, UI_VALUE)
            const rgbString =
              'rgb(' +
              (color[0] * 255).toFixed(0) +
              ',' +
              (color[1] * 255).toFixed(0) +
              ',' +
              (color[2] * 255).toFixed(0) +
              ')'
            setColor(rgbString)
          }}
        >
          {() => 'COLOR'}
        </HuePicker>
      </>
    )
  },
})

export function createUI(flow: Flow) {
  createApp(<Gui flow={flow} />).mount('#gui')
}
