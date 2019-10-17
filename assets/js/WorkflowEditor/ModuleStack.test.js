/* globals describe, expect, it, jest */
import React from 'react'
import { ModuleStack } from './ModuleStack'
// import { mount } from 'enzyme'
import { mountWithI18n } from '../i18n/test-utils'


describe('ModuleStack', () => {
  const wrapper = (extraProps) =>  mountWithI18n(
    <ModuleStack
      api={{}}
      isReadOnly={false}
      tabSlug='tab-1'
      selected_wf_module_position={null}
      wfModules={[]}
      modules={{}}
      moveModuleByIndex={jest.fn()}
      removeModule={jest.fn()}
      testLessonHighlightIndex={jest.fn((i) => false)}
      paneRef={{ current: null }}
      {...extraProps}
    />
  )

  it('should render a placeholder when empty and read-only', () => {
    const w = wrapper({ wfModules: [], isReadOnly: true })
    expect(w.text()).toMatch(/workflow.thistabnosteps/)
  })
})
