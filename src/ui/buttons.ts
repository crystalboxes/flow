import { BUTTON_ACTIVE_COLOR, BUTTON_BACKGROUND, BUTTON_COLOR } from '../shared'

export default class Buttons {
  color: any
  activeElement: HTMLElement
  elements: string | any[]

  constructor(
    elements: string | any[],
    onChangeCallback: (arg0: number) => void
  ) {
    this.elements = elements
    this.activeElement = elements[0]

    for (let i = 0; i < elements.length; ++i) {
      ;(() => {
        //create closure to store index
        const index = i
        const clickedElement = elements[i]
        elements[i].addEventListener('click', () => {
          if (this.activeElement !== clickedElement) {
            this.activeElement = clickedElement

            onChangeCallback(index)

            this.refresh()
          }
        })
      })()
    }
  }

  setColor(newColor: any) {
    this.color = newColor
    this.refresh()
  }

  refresh() {
    for (let i = 0; i < this.elements.length; ++i) {
      if (this.elements[i] === this.activeElement) {
        this.elements[i].style.color = BUTTON_ACTIVE_COLOR
        this.elements[i].style.background = this.color
      } else {
        this.elements[i].style.color = BUTTON_COLOR
        this.elements[i].style.background = BUTTON_BACKGROUND
      }
    }
  }
}
