import { h, defineComponent, ref } from 'vue'
import Flow from '../flow'
import { BUTTON_ACTIVE_COLOR, BUTTON_BACKGROUND, BUTTON_COLOR } from '../shared'

const Buttons = defineComponent({
  props: { flow: Flow, color: String },
  setup() {
    const buttons = ['66K', '131K', '262K', '524K', '1M', '2M']
    const activeIndex = ref(0)
    const setActiveIndex = (index: number) => (activeIndex.value = index)
    return {
      buttons,
      activeIndex,
      setActiveIndex,
    }
  },

  render({
    buttons,
    activeIndex,
    setActiveIndex,
  }: {
    buttons: string[]
    activeIndex: number
    setActiveIndex: (index: number) => number
  }) {
    return (
      <div id="count-wrapper">
        <span class="label">PARTICLE COUNT</span>
        {buttons.map((button, index) => (
          <div
            key={index}
            style={{
              background:
                index === activeIndex ? this.$props.color : BUTTON_BACKGROUND,
              color: index === activeIndex ? BUTTON_ACTIVE_COLOR : BUTTON_COLOR,
            }}
            onClick={() => {
              this.flow?.changeQualityLevel(index)
              setActiveIndex(index)
            }}
          >
            {button}
          </div>
        ))}
      </div>
    )
  },
})

export default Buttons
