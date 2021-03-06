import React from 'react'
import WorkflowNavBar from './WorkflowNavBar'
import { shallow, mount } from 'enzyme'
import { tick } from './test-utils'
import Utils from './utils'
import { jsonResponseMock } from './test-utils'

jest.mock('./utils', () => ({
  goToUrl: jest.fn(),
}))


describe('WorkflowNavBar', () => {
  beforeEach(() => {
    Utils.goToUrl.mockReset()
  })

  it('should link back to /lessons when viewing a lesson', () => {
    const workflow = {
      id: 12,
      name: 'Original Version',
      owner_name: 'John Johnson',
      public: true
    }

    const lesson = {
      course: null,
      header: { title: 'A Lesson' }
    }

    const api = { duplicateWorkflow: jest.fn() }

    const wrapper = mount(
      <WorkflowNavBar
        workflow={workflow}
        api={api}
        lesson={lesson}
        isReadOnly={false}
      /> // no loggedInUser prop
    )

    const a = wrapper.find('.course a')
    expect(a.prop('href')).toEqual('/lessons')
    expect(a.text()).toEqual('Training') // hard-coded
  })

  it('should link back to /courses/slug when viewing a lesson in a course', () => {
    const workflow = {
      id: 12,
      name: 'Original Version',
      owner_name: 'John Johnson',
      public: true
    }

    const lesson = {
      course: {
        title: 'A Course',
        slug: 'a-course'
      },
      header: { title: 'A Lesson' }
    }

    const api = { duplicateWorkflow: jest.fn() }

    const wrapper = mount(
      <WorkflowNavBar
        workflow={workflow}
        api={api}
        lesson={lesson}
        isReadOnly={false}
      /> // no loggedInUser prop
    )

    const a = wrapper.find('.course a')
    expect(a.prop('href')).toEqual('/courses/a-course')
    expect(a.text()).toEqual('A Course')
  })

  it('should duplicate the workflow when user is logged in and clicks the button', async () => {
    const workflow = {
      id: 12,
      name: 'Original Version',
      owner_name: 'John Johnson',
      public: true
    }

    const api = {
      duplicateWorkflow: jest.fn(() => Promise.resolve({
        id: 77,
        name: 'Copy of Original Version',
        owner_name: 'Paula Plagarizer',
        public: false
      }))
    }

    const wrapper = shallow(
      <WorkflowNavBar
        workflow={workflow}
        api={api}
        isReadOnly={false}
        loggedInUser={{ id: 1 }}
      />
    )

    expect(wrapper).toMatchSnapshot()

    expect(wrapper.state().spinnerVisible).toBe(false)

    wrapper.find('button[name="duplicate"]').simulate('click')

    expect(api.duplicateWorkflow).toHaveBeenCalledWith(12)
    // spinner starts immediately
    expect(wrapper.state().spinnerVisible).toBe(true)
    // user isn't redirected yet
    expect(Utils.goToUrl).not.toHaveBeenCalled()

    await tick(); // wait for promise to resolve

    expect(Utils.goToUrl).toHaveBeenCalledWith('/workflows/77')
  })

  it('should redirect to sign-in page when user clicks duplicate button while not logged in', () => {
    const workflow = {
      id: 303,
      name: 'Original Version',
      owner_name: 'Not LogggedIn',
      public: true
    }

    const api = { duplicateWorkflow: jest.fn() }

    const wrapper = shallow(
      <WorkflowNavBar
        workflow={workflow}
        api={api}
        isReadOnly={false}
      /> // no loggedInUser prop
    )

    expect(wrapper).toMatchSnapshot()

    wrapper.find('button[name="duplicate"]').simulate('click')

    expect(api.duplicateWorkflow).not.toHaveBeenCalled()
    expect(Utils.goToUrl).toHaveBeenCalledWith('/account/login')
  })
})
