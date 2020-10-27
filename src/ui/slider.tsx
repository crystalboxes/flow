import {
  h,
  createApp,
  defineComponent,
  ref,
  onMounted,
  render,
  reactive,
  onUnmounted,
} from 'vue'
import Flow from '../flow'
import {
  BUTTON_ACTIVE_COLOR,
  BUTTON_BACKGROUND,
  BUTTON_COLOR,
  getMousePosition,
  hsvToRGB,
  HUE_HIGHLIGHTER_ANGLE_OFFSET,
  HUE_HIGHLIGHTER_LINE_WIDTH,
  HUE_HIGHLIGHTER_RADIUS_OFFSET,
  HUE_HIGHLIGHTER_SATURATION,
  HUE_HIGHLIGHTER_VALUE,
  HUE_INNER_RADIUS,
  HUE_OUTER_RADIUS,
  HUE_PICKER_SATURATION,
  HUE_PICKER_VALUE,
  INITIAL_SPEED,
  INITIAL_TURBULENCE,
  MAX_SPEED,
  MAX_TURBULENCE,
  rgbToString,
  UI_SATURATION,
  UI_VALUE,
} from '../shared'
import Buttons from './buttons'

function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x))
}

const Slider = defineComponent({
  props: {
    value: Number,
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    onChangeCallback: { type: Function, required: true },
    color: String,
  },

  setup({ value, max, min, onChangeCallback }) {
    const currentValue = ref(value)
    const mousePressed = ref(false)
    const setMousePressed = (isPressed: boolean) =>
      (mousePressed.value = isPressed)

    onMounted(() => (currentValue.value = (currentValue?.value || 0) + 0.00001))

    const onChange = (event: MouseEvent, div: HTMLElement | undefined) => {
      if (!div) {
        return
      }

      const mouseX = getMousePosition(event, div).x

      currentValue.value = clamp(
        (mouseX / div.offsetWidth) * (max - min) + min,
        min,
        max
      )
      onChangeCallback(currentValue.value)
    }

    return { currentValue, mousePressed, setMousePressed, onChange }
  },

  render({
    mousePressed,
    currentValue,
    setMousePressed,
    onChange,
  }: {
    mousePressed: boolean
    currentValue: number
    setMousePressed: (isPressed: boolean) => void
    onChange: (e: MouseEvent, div: HTMLElement | undefined) => void
  }) {
    const div = this.$refs.thisDiv as HTMLElement | undefined
    console.log(div, div?.offsetHeight, div?.offsetWidth)
    return (
      <div id="speed-wrapper">
        {this.$slots.default && (
          <span class="label">{this.$slots.default()}</span>
        )}
        <div
          ref="thisDiv"
          class="slider"
          onMousedown={(event) => {
            setMousePressed(true)
            onChange(event, div)
          }}
          onMouseup={(_) => {
            setMousePressed(false)
          }}
          onMousemove={(event) => {
            if (mousePressed) {
              onChange(event, div)
            }
          }}
        >
          <div
            style={{
              position: 'absolute',
              height: (div?.offsetHeight || 1) + 'px',
              background: this.color,
              width:
                ((currentValue - this.min) / (this.max - this.min)) *
                  (div?.offsetWidth || 1) +
                'px',
            }}
          />
        </div>
      </div>
    )
  },
})

export default Slider
