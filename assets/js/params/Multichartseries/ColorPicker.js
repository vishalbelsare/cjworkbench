import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Popper } from 'react-popper'

class ColorChoice extends React.PureComponent {
  static propTypes = {
    color: PropTypes.string.isRequired, // like '#abcdef'
    onClick: PropTypes.func.isRequired // onClick('#abcdef') => undefined
  }

  onClick = () => {
    this.props.onClick(this.props.color)
  }

  render () {
    const { color } = this.props
    const name = 'color-' + color.slice(1)

    return (
      <button
        type='button'
        name={name}
        onClick={this.onClick}
        className='color-choice'
        style={{ backgroundColor: color }}
      />
    )
  }
}

/**
 * a <button> and <input> that let the user write a color.
 */
class CustomColorChoice extends React.PureComponent {
  static propTypes = {
    defaultValue: PropTypes.string.isRequired, // '#abcdef'-style string
    onChange: PropTypes.func.isRequired, // onChange('#abcdef') => undefined
    onClose: PropTypes.func.isRequired // onClose() => undefined -- if Escape is pressed
  }

  state = {
    value: this.props.defaultValue
  }

  get effectiveColor () {
    if (!this.isValid) return '#000000'

    const { value } = this.state
    return value[0] === '#' ? value : `#${value}`
  }

  get isValid () {
    return /^#?[0-9a-fA-F]{6}$/.test(this.state.value)
  }

  onClickButton = () => {
    this.props.onChange(this.effectiveColor)
  }

  onChange = (ev) => {
    this.setState({ value: ev.target.value })
  }

  onKeyDown = (ev) => {
    switch (ev.key) {
      case 'Enter':
        const el = ev.target
        if (this.isValid) {
          this.props.onChange(this.effectiveColor)
          return this.props.onClose()
        }
        break
      case 'Escape':
        this.props.onClose()
        break
    }
  }

  render () {
    const { value } = this.state
    const safeValue = value || '#000000'

    return (
      <div className={`input-group ${this.isValid ? 'valid' : 'invalid'}`}>
        <div className='input-group-prepend'>
          <button
            type='button'
            name='choose-custom-color'
            className='btn choose-custom-color'
            onClick={this.onClickButton}
            style={{ background: this.effectiveColor }}
          />
        </div>
        <input
          className='form-control'
          placeholder='#000000'
          value={value}
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
        />
      </div>
    )
  }
}

/**
 * Re-implement react-popper/src/Manager.js/ManagerContext, so we can
 * access `referenceNode` from within our event handlers.
 *
 * react-popper syntax would _normally_ be:
 *
 *     <Manager> -- holds context in state
 *       <Reference>{({ ref } => <.../>)}</Reference> -- calls context.setReferenceElement
 *       <Popper>{({ ref, style, placement }) => <.../>)}</Popper> -- reads context.referenceElement
 *     </Manager>
 *
 * ... we'll re-implement it as:
 *
 *     <ColorPicker> -- holds context in state
 *       <button ref={this.setReferenceElement} .../> -- sets context.referenceElement
 *       <Popper referenceElement={context.referenceElement}>...</Popper> -- reads context.referenceElement
 *     </ColorPicker>
 */
const ColorPickerContext = React.createContext()
ColorPickerContext.Provider.propTypes = {
  value: PropTypes.shape({
    referenceElement: PropTypes.instanceOf(HTMLElement) // or undefined -- which is the case during load
  })
}

class ColorPickerPopover extends React.PureComponent {
  static propTypes = {
    value: PropTypes.string, // Like '#abcdef'; default is '#000000'
    choices: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
    onChange: PropTypes.func.isRequired, // onChange('#abcdef') => undefined
    onClose: PropTypes.func.isRequired // onClose() => undefined
  }
  static contextType = ColorPickerContext // this.context.referenceElement is the button that opened the menu

  containerRef = React.createRef()

  componentDidMount () {
    document.addEventListener('mousedown', this.onMouseDown, true)
  }

  componentWillUnmount () {
    document.removeEventListener('mousedown', this.onMouseDown, true)
  }

  /**
   * Close the popover if we click outside it.
   */
  onMouseDown = (ev) => {
    const { referenceElement } = this.context
    if (referenceElement && (referenceElement === ev.target || referenceElement.contains(ev.target))) {
      // The user clicked the "toggle" button. Don't do anything -- the toggle-button
      // handler will close the popover for us.
      return
    }

    const container = this.containerRef.current

    if (this.containerRef.current && !this.containerRef.current.contains(ev.target)) {
      this.props.onClose()
    }
  }

  render () {
    const { safeValue, choices, onChange, onClose } = this.props
    const { referenceElement } = this.context

    return ReactDOM.createPortal((
      <Popper placement='bottom' referenceElement={referenceElement}>
        {({ ref, style, placement, arrowProps }) => (
          <div
            className={`popover show bs-popover-${placement} color-picker-popover`}
            ref={ref}
            style={style}
            data-placement={placement}
          >
            <div className='arrow' {...arrowProps} />
            <div ref={this.containerRef} className='popover-body'>
              {choices.map(color => (
                <ColorChoice key={'choice-' + color} color={color} onClick={onChange} />
              ))}
              <CustomColorChoice
                key={'custom-choice-' + safeValue}
                defaultValue={safeValue}
                onChange={onChange}
                onClose={onClose}
              />
            </div>
          </div>
        )}
      </Popper>
    ), document.body)
  }
}

/**
 * A simulation for `<input type="color" list=...`, which has lousy
 * cross-browser support in 2018.
 */
export default class ColorPicker extends React.PureComponent {
  static propTypes = {
    value: PropTypes.string.isRequired, // Like '#abcdef'
    choices: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
    onChange: PropTypes.func.isRequired // onChange('#abcdef') => undefined
  }

  setReferenceElement = (referenceElement) => {
    this.setState({ context: { referenceElement } })
  }

  state = {
    isOpen: false,
    context: {
      referenceElement: undefined
    }
  }

  toggleOpen = () => {
    this.setState({ isOpen: !this.state.isOpen })
  }

  close = () => {
    this.setState({ isOpen: false })
  }

  onChange = (color) => {
    this.props.onChange(color)
    this.setState({ isOpen: false })
  }

  render () {
    const { value, choices } = this.props
    const { isOpen, context } = this.state
    const safeValue = value || '#000000'

    return (
      <ColorPickerContext.Provider value={context}>
        <button
          type='button'
          title='Pick color'
          onClick={this.toggleOpen}
          className='btn color-picker'
          style={{ background: safeValue }}
          ref={this.setReferenceElement}
        >
          <i className='color-picker' />
        </button>
        {isOpen ? (
          <ColorPickerPopover
            safeValue={safeValue}
            choices={choices}
            onChange={this.onChange}
            onClose={this.close}
          />
        ) : null}
      </ColorPickerContext.Provider>
    )
  }
}
