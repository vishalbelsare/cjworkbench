// Elements of /workflows. Navbar plus a list

import React from 'react'
import WorkflowListNavBar from './WorkflowListNavBar'
import WfContextMenu from './WfContextMenu'
import WorkflowMetadata from './WorkflowMetadata'
import PropTypes from 'prop-types'
import ShareModal from './ShareModal/ModalLoader' // _not_ the Redux-connected component, 'ShareModal'
import { goToUrl, logUserEvent } from './utils'
import WfSortMenu from './WfSortMenu'
import TabContent from 'reactstrap/lib/TabContent'
import TabPane from 'reactstrap/lib/TabPane'
import Nav from 'reactstrap/lib/Nav'
import NavItem from 'reactstrap/lib/NavItem'
import NavLink from 'reactstrap/lib/NavLink'

// Tab names define here for easy change if necessary
const tabHeaders = ['My workflows', 'Workflows shared with me']

export default class Workflows extends React.Component {
  static propTypes = {
    api: PropTypes.object.isRequired
  }

  state = {
    workflows: [],
    activeTab: tabHeaders[0],
    shareModalWorkflowId: null,
    sortMethod: {type: 'last_update', direction: 'descending'}
  }

  openShareModal = (workflowId) => {
    this.setState({ shareModalWorkflowId: workflowId })
  }

  closeShareModal = () => {
    this.setState({ shareModalWorkflowId: null })
  }

  logShare = (type) => {
    logUserEvent('Share workflow ' + type)
  }

  renderShareModal = () => {
    const { shareModalWorkflowId } = this.state

    if (shareModalWorkflowId === null) return null

    const workflow = this.state.workflows.find(w => w.id === shareModalWorkflowId)
    if (!workflow) return null

    const url = `${window.origin}/workflows/${workflow.id}`

    return (
      <ShareModal
        url={url}
        ownerEmail={workflow.owner_email}
        workflowId={workflow.id}
        isReadOnly={workflow.is_owner}
        isPublic={workflow.public}
        onChangeIsPublic={this.setIsPublicFromShareModal}
        logShare={this.logShare}
        onClickClose={this.closeShareModal}
      />
    )
  }

  // Make a new workflow when button clicked, and navigate to its Module List page
  click = (e) => {
    this.props.api.newWorkflow()
      .then(json => {
        // navigate to new WF page
        goToUrl('/workflows/' + json.id)
      })
  }

  // Ask the user if they really wanna do this. If sure, post DELETE to server
  deleteWorkflow = (id) => {
    if (!confirm("Permanently delete this workflow?"))
      return

    this.props.api.deleteWorkflow(id)
    .then(response => {
      var workflowsMinusID = this.state.workflows.filter(wf => wf.id != id)
      this.setState({workflows: workflowsMinusID})
    })
  }

  duplicateWorkflow = (id) => {
    this.props.api.duplicateWorkflow(id)
      .then(json => {
        // Add to beginning of list because wf list is reverse chron
        var workflowsPlusDup = this.state.workflows.slice()
        workflowsPlusDup.unshift(json)
        this.setState({workflows: workflowsPlusDup})
      })
  }

  componentDidMount() {
    this.props.api.listWorkflows().then(json => {
      this.setState({workflows: json})
      // Set the activeTab to shared if user has no workflows but has at least 1 shared
      if (this.getOwnedWorkflows().length === 0 &&
        this.getSharedWorkflows().length > 0) {
        this.setState({activeTab: tabHeaders[1]})
      }
    })
  }

  setIsPublicFromShareModal = (isPublic) => {
    const workflowId = this.state.shareModalWorkflowId

    // Change the given workflow to be public
    const newWorkflows = this.state.workflows
        .map(w => w.id === workflowId ? { ...w, public: isPublic } : w)

    this.setState({ workflows: newWorkflows })

    this.props.api.setWorkflowPublic(workflowId, isPublic)
  }

  preventDefault = (ev) => {
    ev.preventDefault()
  }

  toggle (tab) {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      })
    }
  }

  // returns my workflows
  getOwnedWorkflows = () => {
    return this.state.workflows.filter(workflow => {
      return workflow.is_owner === true
    })
  }

  // returns shared workflows
  getSharedWorkflows = () => {
    return this.state.workflows.filter(workflow => {
      return workflow.is_owner === false
    })
  }

  setSortType = (sortType) => {
    this.setState({sortMethod: sortType})
  }

  // sorting comparator
  propComparator = () => {
    // sort method determined by state array
    const prop = this.state.sortMethod.type
    const direction = this.state.sortMethod.direction
    switch (prop + '|' + direction) {
      case ('last_update|ascending'):
        return function (a, b) {
          return new Date(a['last_update']) - new Date(b['last_update'])
        }
      case ('name|ascending'):
        return function (a, b) {
          const first = a['name'].toLowerCase()
          const second = b['name'].toLowerCase()
          if (first < second) return -1
          if (first > second) return 1
          return 0
        }
      case ('name|descending'):
        return function (a, b) {
          const first = a['name'].toLowerCase()
          const second = b['name'].toLowerCase()
          if (second < first) return -1
          if (second > first) return 1
          return 0
        }
      // default sort modified descending
      default:
        return function (a, b) {
          return new Date(b['last_update']) - new Date(a['last_update'])
        }
    }
  }

  renderWorkflowPane = (workflows, tab) => {
    if (workflows.length > 0) {
      // Sort based on state
      workflows.slice().sort(this.propComparator())
      return (
        <TabPane tabId={tab}>
          <div className='workflows-item--wrap'>
            {workflows.map(workflow => (
              <a href={'/workflows/' + workflow.id} className='workflow-item' key={workflow.id}>
                <div className='mt-1'>
                  <div className='workflow-title'>{workflow.name}</div>
                  <div className='wf-meta--id'>
                    <WorkflowMetadata
                      workflow={workflow}
                      openShareModal={this.openShareModal}
                    />
                  </div>
                </div>
                <div onClick={this.preventDefault} className='menu-test-class'>
                  <WfContextMenu
                    duplicateWorkflow={() => this.duplicateWorkflow(workflow.id)}
                    deleteWorkflow={() => this.deleteWorkflow(workflow.id)}
                  />
                </div>
              </a>
            ))}
          </div>
        </TabPane>
      )
    } else if (tab === tabHeaders[0]){
      // Create workflow link if no owned workflows
      return (
        <TabPane tabId={tabHeaders[0]}>
          <div>
            <a className={'new-workflow-link'} onClick={this.click}>Create Workflow</a>
          </div>
        </TabPane>
      )
    } else if (tab === tabHeaders[1]){
      // No shared workflows message
      return (
        <TabPane tabId={tabHeaders[1]}>
          <div>No shared workflows</div>
        </TabPane>
      )
    }
  }

  render () {
    // Sets active tab based on state
    let navTabs = (
      <Nav tabs>
        <div className="tab-group">
          { tabHeaders.map(tabHeader => (
            <NavItem>
              <NavLink
                className={this.state.activeTab === tabHeader ? 'active' : ''}
                onClick={() => { this.toggle(tabHeader) }}
              >
                {tabHeader}
              </NavLink>
            </NavItem>
          ))
          }
        </div>
        <div className="sort-group">
          <span>Sort</span>
          <WfSortMenu setSortType={this.setSortType} sortDirection={this.state.sortMethod.direction} />
        </div>
      </Nav>
    )
    // Separate workflows by type and render
    let tabPanes = []
    tabPanes.push(this.renderWorkflowPane(this.getOwnedWorkflows(), tabHeaders[0]))
    tabPanes.push(this.renderWorkflowPane(this.getSharedWorkflows(), tabHeaders[1]))

    return (
      <div className='workflows-page'>
        <WorkflowListNavBar />
        <div className='container'>
          <a href='/lessons/' className='lesson-banner mx-auto'>
            <div>
              <div className='content-3'>NEW</div>
              <div className='d-flex'>
                <span className='icon-star'></span>
                <div className=' title-2 '>TUTORIALS</div>
              </div>
            </div>
            <p>Learn how to work with data without coding</p>
          </a>
          <div className='d-flex justify-content-center'>
            <button className='button-blue action-button new-workflow-button' onClick={this.click}>Create Workflow</button>
          </div>
          <div className='mx-auto workflows-list'>
            {navTabs}
            <TabContent activeTab={this.state.activeTab}>
              {tabPanes}
            </TabContent>
          </div>
        </div>
        {this.renderShareModal()}
      </div>
    )
  }
}
