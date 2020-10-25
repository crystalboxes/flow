import { getMousePosition } from '../shared'

function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x))
}

export default class Slider {
  color = 'black'
  value: number
  innerDiv: HTMLElement
  div: HTMLElement
  min: number
  max: number
  onChangeCallback: (arg0: number) => void
  mousePressed = false

  constructor(
    element: any,
    min: number,
    max: number,
    initialValue: any,
    onChangeCallback: (arg0: number) => void
  ) {
    this.min = min
    this.max = max
    this.div = element
    this.value = initialValue
    this.onChangeCallback = onChangeCallback

    this.innerDiv = document.createElement('div')
    this.innerDiv.style.position = 'absolute'
    this.innerDiv.style.height = this.div.offsetHeight + 'px'

    this.div.appendChild(this.innerDiv)

    this.redraw()

    this.div.addEventListener('mousedown', (event: any) => {
      this.mousePressed = true
      this.onChange(event)
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

  onChange(event: MouseEvent) {
    const mouseX = getMousePosition(event, this.div).x

    this.value = clamp(
      (mouseX / this.div.offsetWidth) * (this.max - this.min) + this.min,
      this.min,
      this.max
    )

    this.onChangeCallback(this.value)

    this.redraw()
  }

  setColor(newColor: string) {
    this.color = newColor
    this.redraw()
  }

  getValue() {
    return this.value
  }

  redraw() {
    const fraction = (this.value - this.min) / (this.max - this.min)
    this.innerDiv.style.background = this.color
    this.innerDiv.style.width = fraction * this.div.offsetWidth + 'px'
    this.innerDiv.style.height = this.div.offsetHeight + 'px'
  }
}
