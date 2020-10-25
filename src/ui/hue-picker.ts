import {
  hsvToRGB,
  HUE_PICKER_SATURATION,
  HUE_PICKER_VALUE,
  HUE_OUTER_RADIUS,
  HUE_INNER_RADIUS,
  HUE_HIGHLIGHTER_ANGLE_OFFSET,
  HUE_HIGHLIGHTER_RADIUS_OFFSET,
  HUE_HIGHLIGHTER_SATURATION,
  HUE_HIGHLIGHTER_VALUE,
  rgbToString,
  HUE_HIGHLIGHTER_LINE_WIDTH,
  getMousePosition,
} from '../shared'

export default class HuePicker {
  canvas: HTMLCanvasElement
  changeCallback: Function
  context: CanvasRenderingContext2D
  mousePressed = false
  spectrumCanvas: HTMLCanvasElement = document.createElement('canvas')
  hue = 0.0 //in the range [0, 1]

  constructor(
    canvas: HTMLCanvasElement,
    onChangeCallback: (hue: number) => void
  ) {
    this.canvas = canvas
    this.changeCallback = onChangeCallback

    this.context = canvas.getContext('2d') as CanvasRenderingContext2D

    this.changeCallback(this.hue)

    this.spectrumCanvas = document.createElement('canvas')
    this.spectrumCanvas.width = canvas.width
    this.spectrumCanvas.height = canvas.height
    const spectrumContext = this.spectrumCanvas.getContext('2d')
    if (!spectrumContext) {
      throw new Error('')
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

    this.redraw()

    // @ts-ignore
    this.getHue = function () {
      return this.hue
    }

    canvas.addEventListener('mousedown', (event) => {
      const mouseX = getMousePosition(event, canvas).x
      const mouseY = getMousePosition(event, canvas).y

      const xDistance = canvas.width / 2 - mouseX
      const yDistance = canvas.height / 2 - mouseY
      const distance = Math.sqrt(xDistance * xDistance + yDistance * yDistance)

      if (distance < HUE_OUTER_RADIUS) {
        this.mousePressed = true
        this.onChange(event)
      }
    })

    document.addEventListener('mouseup', (event) => {
      this.mousePressed = false
    })

    document.addEventListener('mousemove', (event) => {
      if (this.mousePressed) {
        this.onChange(event)
      }
    })
  }

  onChange = (event: MouseEvent) => {
    const mouseX = getMousePosition(event, this.canvas).x
    const mouseY = getMousePosition(event, this.canvas).y

    const angle =
      Math.atan2(
        mouseY - this.canvas.width / 2,
        mouseX - this.canvas.width / 2
      ) + Math.PI

    this.hue = angle / (Math.PI * 2.0)

    this.changeCallback(this.hue)

    this.redraw()
  }

  redraw() {
    const context = this.context
    context.clearRect(0, 0, this.canvas.width, this.canvas.height)

    context.save()

    context.fillStyle = 'black'
    context.beginPath()
    context.arc(
      this.canvas.width / 2,
      this.canvas.height / 2,
      HUE_OUTER_RADIUS,
      0,
      Math.PI * 2,
      false
    )
    context.arc(
      this.canvas.width / 2,
      this.canvas.height / 2,
      HUE_INNER_RADIUS,
      0,
      Math.PI * 2,
      true
    )
    context.fill()

    context.globalCompositeOperation = 'source-in'
    context.drawImage(this.spectrumCanvas, 0, 0)

    context.restore()

    context.globalCompositeOperation = 'source-over'

    const startAngle =
      (this.hue - 0.5) * Math.PI * 2 - HUE_HIGHLIGHTER_ANGLE_OFFSET
    const endAngle =
      (this.hue - 0.5) * Math.PI * 2 + HUE_HIGHLIGHTER_ANGLE_OFFSET

    context.beginPath()
    context.arc(
      this.canvas.width / 2,
      this.canvas.height / 2,
      HUE_INNER_RADIUS - HUE_HIGHLIGHTER_RADIUS_OFFSET,
      startAngle,
      endAngle,
      false
    )
    context.arc(
      this.canvas.width / 2,
      this.canvas.height / 2,
      HUE_OUTER_RADIUS + HUE_HIGHLIGHTER_RADIUS_OFFSET,
      endAngle,
      startAngle,
      true
    )
    context.closePath()

    const color = hsvToRGB(
      this.hue,
      HUE_HIGHLIGHTER_SATURATION,
      HUE_HIGHLIGHTER_VALUE
    )
    const rgbString = rgbToString(color)

    context.strokeStyle = rgbString
    context.lineWidth = HUE_HIGHLIGHTER_LINE_WIDTH
    context.stroke()
  }
}
