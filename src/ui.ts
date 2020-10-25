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
  BUTTON_ACTIVE_COLOR,
  BUTTON_COLOR,
  BUTTON_BACKGROUND,
} from './shared'

export var HuePicker = function (
  canvas: HTMLCanvasElement,
  changeCallback: Function
) {
  var context: CanvasRenderingContext2D = canvas.getContext(
    '2d'
  ) as CanvasRenderingContext2D
  var hue = 0.0 //in the range [0, 1]

  changeCallback(hue)

  var spectrumCanvas = document.createElement('canvas')
  spectrumCanvas.width = canvas.width
  spectrumCanvas.height = canvas.height
  var spectrumContext = spectrumCanvas.getContext('2d')
  if (!spectrumContext) {
    throw new Error('')
  }

  var imageData = spectrumContext.createImageData(canvas.width, canvas.height)
  for (var y = 0; y < canvas.height; y += 1) {
    for (var x = 0; x < canvas.width; x += 1) {
      var angle =
        Math.atan2(y - canvas.height / 2, x - canvas.width / 2) + Math.PI

      var color = hsvToRGB(
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

  var redraw = function () {
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

    var startAngle = (hue - 0.5) * Math.PI * 2 - HUE_HIGHLIGHTER_ANGLE_OFFSET
    var endAngle = (hue - 0.5) * Math.PI * 2 + HUE_HIGHLIGHTER_ANGLE_OFFSET

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

    var color = hsvToRGB(hue, HUE_HIGHLIGHTER_SATURATION, HUE_HIGHLIGHTER_VALUE)
    var rgbString = rgbToString(color)

    context.strokeStyle = rgbString
    context.lineWidth = HUE_HIGHLIGHTER_LINE_WIDTH
    context.stroke()
  }

  redraw()

  // @ts-ignore
  this.getHue = function () {
    return hue
  }

  var mousePressed = false

  canvas.addEventListener('mousedown', function (event) {
    var mouseX = getMousePosition(event, canvas).x
    var mouseY = getMousePosition(event, canvas).y

    var xDistance = canvas.width / 2 - mouseX
    var yDistance = canvas.height / 2 - mouseY
    var distance = Math.sqrt(xDistance * xDistance + yDistance * yDistance)

    if (distance < HUE_OUTER_RADIUS) {
      mousePressed = true
      onChange(event)
    }
  })

  document.addEventListener('mouseup', function (event) {
    mousePressed = false
  })

  document.addEventListener('mousemove', function (event) {
    if (mousePressed) {
      onChange(event)
    }
  })

  var onChange = function (event: MouseEvent) {
    var mouseX = getMousePosition(event, canvas).x
    var mouseY = getMousePosition(event, canvas).y

    var angle =
      Math.atan2(mouseY - canvas.width / 2, mouseX - canvas.width / 2) + Math.PI

    hue = angle / (Math.PI * 2.0)

    changeCallback(hue)

    redraw()
  }
}

var clamp = function (x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x))
}

export var Slider = function (
  element: any,
  min: number,
  max: number,
  initialValue: any,
  changeCallback: (arg0: any) => void
) {
  var div = element

  var innerDiv = document.createElement('div')
  innerDiv.style.position = 'absolute'
  innerDiv.style.height = div.offsetHeight + 'px'

  div.appendChild(innerDiv)

  var color = 'black'

  var value = initialValue

  // @ts-ignore
  this.setColor = function (newColor: string) {
    color = newColor
    redraw()
  }

  // @ts-ignore
  this.getValue = function () {
    return value
  }

  var mousePressed = false

  var redraw = function () {
    var fraction = (value - min) / (max - min)
    innerDiv.style.background = color
    innerDiv.style.width = fraction * div.offsetWidth + 'px'
    innerDiv.style.height = div.offsetHeight + 'px'
  }

  redraw()

  div.addEventListener('mousedown', function (event: any) {
    mousePressed = true
    onChange(event)
  })

  document.addEventListener('mouseup', function (event) {
    mousePressed = false
  })

  document.addEventListener('mousemove', function (event) {
    if (mousePressed) {
      onChange(event)
    }
  })

  var onChange = function (event: MouseEvent) {
    var mouseX = getMousePosition(event, div).x

    value = clamp((mouseX / div.offsetWidth) * (max - min) + min, min, max)

    changeCallback(value)

    redraw()
  }
}

export var Buttons = function (
  elements: string | any[],
  changeCallback: (arg0: number) => void
) {
  var activeElement = elements[0]

  var color: any

  // @ts-ignore
  this.setColor = function (newColor: any) {
    color = newColor
    refresh()
  }

  var refresh = function () {
    for (var i = 0; i < elements.length; ++i) {
      if (elements[i] === activeElement) {
        elements[i].style.color = BUTTON_ACTIVE_COLOR
        elements[i].style.background = color
      } else {
        elements[i].style.color = BUTTON_COLOR
        elements[i].style.background = BUTTON_BACKGROUND
      }
    }
  }

  for (var i = 0; i < elements.length; ++i) {
    ;(function () {
      //create closure to store index
      var index = i
      var clickedElement = elements[i]
      elements[i].addEventListener('click', function () {
        if (activeElement !== clickedElement) {
          activeElement = clickedElement

          changeCallback(index)

          refresh()
        }
      })
    })()
  }
}
