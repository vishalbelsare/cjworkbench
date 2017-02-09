// UI for a single module within a workflow

import React from 'react'
import { store, wfModuleStatusAction } from './workflow-reducer'

// Libraries to provide a collapsable table view
var Collapse = require('pui-react-collapse').Collapse;
var DataGrid = require('react-datagrid');
require('react-datagrid/index.css');

import {BarChart} from 'react-easy-chart';

// ---- CustomParameter ----
// atm a shim for a simple chart

class CustomParameter extends React.Component {
  constructor(props) {
    super(props);
    this.loadingState = { tableData: [], loading: true };
    this.state = { tableData: [], loading: false };           // componentDidMount will trigger first load
  }

  // Load table data from render API
  loadTable() {
    var self = this;
    var url = '/api/wfmodules/' + this.props.id + '/input';
    fetch(url)
      .then(response => response.json())
      .then(json => {
        self.setState({tableData: json, loading: false});
      }); // triggers re-render
  }

  // Load table when first rendered
  componentDidMount() {
    this.loadTable()
  }

  // If the revision changes from under us reload the table, which will trigger a setState and re-render
  componentWillReceiveProps(nextProps) {
    if (this.props.revision != nextProps.revision) {
      this.setState(this.loadingState);               // "unload" the table
      this.loadTable();
    }
  }

  // Update only when we are not loading
  shouldComponentUpdate(nextProps, nextState) {
    return !nextState.loading;
  }

  render() {
      var tableData = this.state.tableData;

      if (tableData.length > 0 && !this.state.loading) {
        var xcol = 'date';
        var ycol = 'value';
        var data = tableData.map( row => { return { 'x': row[xcol], 'y': row[ycol] } } );

        return (
          <BarChart width='700' axes axisLabels={{x: xcol, y: ycol}} data={data}/>
        )
      } else {
        return false;
      }
  }
}

// ---- WfParameter - a single editable parameter ----

class WfParameter extends React.Component {

  constructor(props) {
    super(props)

    this.type = this.props.p.parameter_spec.type;
    this.name = this.props.p.parameter_spec.name;

    this.keyPress = this.keyPress.bind(this);
    this.blur = this.blur.bind(this);
    this.click = this.click.bind(this);
  }

  paramChanged(e) {
    // console.log("PARAM CHANGED");
    var newVal = {};
    newVal[this.type] = e.target.value;
    this.props.onParamChanged(this.props.p.id, newVal);
  }

  // Save value (and re-render) when user presses enter or we lose focus
  // Applies only to non-text fields
  keyPress(e) {
    if (this.type != 'text' && e.key == 'Enter') {
        this.paramChanged(e);
        e.preventDefault();       // eat the Enter so it doesn't get in out input field
    }
  }

  blur(e) {
    this.paramChanged(e);
  }

  // Send event to server for button click
  click(e) {
    if (this.type == 'button') {
      var url = '/api/parameters/' + this.props.p.id + '/event';
      var eventData = {'type': 'click'};
      fetch(url, {
        method: 'post',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      }).then(response => {
        if (!response.ok)
          store.dispatch(wfModuleStatusAction(this.props.wf_module_id, 'error', response.statusText))
      });
    }
  }

  render() {
    switch (this.type) {
      case 'string':
        return (
          <div>
            <div>{this.name}:</div>
            <textarea className='wfmoduleStringInput' rows='1' defaultValue={this.props.p.string} onBlur={this.blur} onKeyPress={this.keyPress} />
          </div>
        );

      case 'number':
        return (
          <div>
            <div>{this.name}:</div>
            <textarea className='wfmoduleNumberInput' rows='1' defaultValue={this.props.p.number} onBlur={this.blur} onKeyPress={this.keyPress} />
          </div>
        );

      case 'text':
        return (
          <div>
            <div>{this.name}:</div>
            <textarea className='wfmoduleTextInput' rows='4' defaultValue={this.props.p.text} onBlur={this.blur} onKeyPress={this.keyPress} />
          </div>
        );

      case 'button':
        return (
          <div>
            <button className='wfmoduleButton' onClick={this.click}>{this.name}</button>
          </div>
        );

      case 'custom':
        return (
          <div>
            <CustomParameter id={this.props.wf_module_id} type={this.props.p.string} revision={this.props.revision}  />
          </div>
        );

      default:
        return null;  // unrecognized parameter type
    }
  }
}

// ---- StatusLight ----
// Ready, Busy, or Error
class StatusLight extends React.Component {
  render() {
    return <div className={this.props.status + '-light'}></div>
  }
}

// ---- StatusLine ----
// Display error message, if any
class StatusLine extends React.Component {
  render() {
    if (this.props.status == 'error') {
      return <div className='wfModuleErrorMsg'>{this.props.error_msg}</div>
    } else if (this.props.status == 'busy') {
      return <div className='wfModuleErrorMsg'>Working...</div>
    } else {
      return false
    }
  }
}


// ---- TableView ----
// Displays the module's rendered output, if any


class TableView extends React.Component {
  constructor(props) {
    super(props);
    this.loadingState = { tableData: [], loading: true };
    this.state = { tableData: [], loading: false };           // componentDidMount will trigger first load
  }

  // Load table data from render API
  loadTable() {
    var self = this;
    var url = '/api/wfmodules/' + this.props.id + '/render';
    fetch(url)
      .then(response => response.json())
      .then(json => {
        self.setState({tableData: json, loading: false});
      }); // triggers re-render
  }

  // Load table when first rendered
  componentDidMount() {
    this.loadTable()
  }

  // If the revision changes from under us reload the table, which will trigger a setState and re-render
  componentWillReceiveProps(nextProps) {
    if (this.props.revision != nextProps.revision) {
      this.setState(this.loadingState);               // "unload" the table
      this.loadTable();
    }
  }

  // Update only when we are not loading
  shouldComponentUpdate(nextProps, nextState) {
    return !nextState.loading;
  }

  render() {
    var tableData = this.state.tableData;
    var table;

    // Generate the table if there's any data
    if (tableData.length > 0 && !this.state.loading) {

      var columns = Object.keys(tableData[0]).filter(key => key!='index').map( key => { return { 'name': key, 'title': key } });
      table =
        <Collapse header='Output'>
          <DataGrid idProperty="index" dataSource={tableData} columns={columns} />
        </Collapse>

    }  else {
      table = <p>(no data)</p>;
    }

    return table;
  }
}



// ---- WfModule ----

export default class WfModule extends React.Component {

  render() {
    var wf_module = this.props['data-wfmodule'];
    var module = wf_module.module;
    var params= wf_module.parameter_vals;
    var onParamChanged = this.props['data-onParamChanged'];
    var revision = this.props['data-revision'];

    // Each parameter gets a WfParameter
    var paramdivs = params.map((ps, i) =>
      { return <WfParameter p={ps} key={i} onParamChanged={onParamChanged} wf_module_id={wf_module.id} revision={revision}/> } );

    // Putting it all together: name, status, parameters, output
    return (
      <div {...this.props} className="module-li">
        <div>
          <h1 className='moduleName'>{module.name}</h1>
          <StatusLight status={wf_module.status}/>
        </div>
        <div style={{'clear':'both'}}></div>
        <StatusLine status={wf_module.status} error_msg={wf_module.error_msg} />
        {paramdivs}
        <TableView id={wf_module.id} statusReady={wf_module.status == 'ready'} revision={revision}/>
      </div>
    ); 
  } 
}
