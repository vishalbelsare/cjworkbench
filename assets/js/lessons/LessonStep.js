import React from 'react'
import PropTypes from 'prop-types'
import { LessonHighlightsType } from '../util/LessonHighlight'

export default class LessonStep extends React.PureComponent {
  render() {
    const { html, status } = this.props

    return (
      <li className={status}>
        <div className="description" dangerouslySetInnerHTML={({__html: html})}></div>
      </li>
    )
  }
}

LessonStep.Status = {
  FUTURE: 'future',
  ACTIVE: 'active',
  DONE: 'done',
}

LessonStep.propTypes = {
  html: PropTypes.string.isRequired,
  status: PropTypes.oneOf([
    LessonStep.Status.FUTURE,
    LessonStep.Status.ACTIVE,
    LessonStep.Status.DONE,
  ]).isRequired,
}
