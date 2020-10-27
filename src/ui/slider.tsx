import { h, defineComponent, ref, onMounted } from 'vue'
import { getMousePosition } from '../shared'

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
