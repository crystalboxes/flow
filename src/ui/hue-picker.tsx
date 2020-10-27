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
import Slider from './slider'

const HuePicker = defineComponent({
  props: {
    onChangeCallback: { type: Function, required: true },
  },
  setup(props, context) {
    const canvasRef = ref(null as null | HTMLCanvasElement)
    const contextRef = ref(null as null | CanvasRenderingContext2D)
    const spectrumCanvasRef = ref(null as null | HTMLCanvasElement)
    const hue = ref(0)
    const mousePressed = ref(false)

    const redraw = () => {
      const context = contextRef.value
      const canvas = canvasRef.value
      const spectrumCanvas = spectrumCanvasRef.value
      if (!context || !canvas || !spectrumCanvas) {
        return
      }
      context.clearRect(0, 0, canvas.width, canvas.height)

      context.save()

      context.fillStyle = 'black'
      context.beginPath()
      context.arc(
        canvas.width / 2,
        canvas.height / 2,
        HUE_OUTER_RADIUS,
        0,
        Math.PI * 2,
        false
      )
      context.arc(
        canvas.width / 2,
        canvas.height / 2,
        HUE_INNER_RADIUS,
        0,
        Math.PI * 2,
        true
      )
      context.fill()

      context.globalCompositeOperation = 'source-in'
      context.drawImage(spectrumCanvas, 0, 0)

      context.restore()

      context.globalCompositeOperation = 'source-over'

      const startAngle =
        (hue.value - 0.5) * Math.PI * 2 - HUE_HIGHLIGHTER_ANGLE_OFFSET
      const endAngle =
        (hue.value - 0.5) * Math.PI * 2 + HUE_HIGHLIGHTER_ANGLE_OFFSET

      context.beginPath()
      context.arc(
        canvas.width / 2,
        canvas.height / 2,
        HUE_INNER_RADIUS - HUE_HIGHLIGHTER_RADIUS_OFFSET,
        startAngle,
        endAngle,
        false
      )
      context.arc(
        canvas.width / 2,
        canvas.height / 2,
        HUE_OUTER_RADIUS + HUE_HIGHLIGHTER_RADIUS_OFFSET,
        endAngle,
        startAngle,
        true
      )
      context.closePath()

      const color = hsvToRGB(
        hue.value,
        HUE_HIGHLIGHTER_SATURATION,
        HUE_HIGHLIGHTER_VALUE
      )
      const rgbString = rgbToString(color)

      context.strokeStyle = rgbString
      context.lineWidth = HUE_HIGHLIGHTER_LINE_WIDTH
      context.stroke()
    }

    const onChange = (event: MouseEvent) => {
      const canvas = canvasRef.value
      if (!canvas) {
        return
      }
      const mouseX = getMousePosition(event, canvas).x
      const mouseY = getMousePosition(event, canvas).y

      const angle =
        Math.atan2(mouseY - canvas.width / 2, mouseX - canvas.width / 2) +
        Math.PI

      hue.value = angle / (Math.PI * 2.0)

      props.onChangeCallback(hue.value)

      redraw()
    }

    onMounted(() => {
      const { value: canvas } = canvasRef
      if (!canvas) {
        throw new Error("Canvas wasn't initialized.")
      }
      const context = canvas?.getContext('2d')
      if (!context) {
        return
      }
      contextRef.value = context
      props.onChangeCallback(hue.value)
      spectrumCanvasRef.value = document.createElement(
        'canvas'
      ) as HTMLCanvasElement

      spectrumCanvasRef.value.width = canvas.width
      spectrumCanvasRef.value.height = canvas.height

      const spectrumContext = spectrumCanvasRef.value.getContext('2d')
      if (!spectrumContext) {
        throw new Error("Couldn't initialize canvas context.")
      }

      const imageData = spectrumContext.createImageData(
        canvas.width,
        canvas.height
      )
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const angle =
            Math.atan2(y - canvas.height / 2, x - canvas.width / 2) + Math.PI

          const color = hsvToRGB(
            angle / (2.0 * Math.PI),
            HUE_PICKER_SATURATION,
            HUE_PICKER_VALUE
          )

          imageData.data[(y * canvas.width + x) * 4] = color[0] * 255
          imageData.data[(y * canvas.width + x) * 4 + 1] = color[1] * 255
          imageData.data[(y * canvas.width + x) * 4 + 2] = color[2] * 255
          imageData.data[(y * canvas.width + x) * 4 + 3] = 255
        }
      }

      spectrumContext.putImageData(imageData, 0, 0)

      redraw()
    })

    onUnmounted(() => {
      if (spectrumCanvasRef.value) {
        spectrumCanvasRef.value.remove()
      }
    })

    return () => (
      <div
        id="color-wrapper"
        onMousedown={(event) => {
          const canvas = canvasRef.value
          if (!canvas) {
            return
          }
          const mouseX = getMousePosition(event, canvas).x
          const mouseY = getMousePosition(event, canvas).y

          const xDistance = canvas.width / 2 - mouseX
          const yDistance = canvas.height / 2 - mouseY
          const distance = Math.sqrt(
            xDistance * xDistance + yDistance * yDistance
          )

          if (distance < HUE_OUTER_RADIUS) {
            mousePressed.value = true
            onChange(event)
          }
        }}
        onMousemove={(event) => {
          if (mousePressed.value) {
            onChange(event)
          }
        }}
        onMouseup={(_) => {
          mousePressed.value = false
        }}
      >
        {context.slots.default && (
          <div id="color-label">{context.slots.default()}</div>
        )}
        <canvas ref={canvasRef} id="picker" width="170" height="170"></canvas>
      </div>
    )
  },
})

export default HuePicker
