import React, {Fragment, PureComponent} from 'camunda-modeler-plugin-helpers/react';
import {Fill} from 'camunda-modeler-plugin-helpers/components';
import Select from 'react-select';
import ReactDOM from 'react-dom';
import ConfigModal from "./ConfigModal";
import TagJSON from './TagJSON';
import CustomRenderer from './custom';
import Dexie from 'dexie';

import ReactExport from "react-export-excel";

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

const defaultButtonText = 'Select element...'

const defaultState = {
    modalOpen: false,
    selected_element: defaultButtonText,
    modeler: '',
    active: '',
    updateTag: [],
    camundaVersion: 5
};
let active = true;

export default class SelectPlugin extends PureComponent {
    constructor(props) {
        super(props);
        this.state = defaultState;

        this.handleSelectedElement = this.handleSelectedElement.bind(this);
        this.handleClosed = this.handleClosed.bind(this);
        this.handleExport = this.handleExport.bind(this);
        this.handleUpdateTag = this.handleUpdateTag.bind(this);
    }

    componentDidMount() {
        const {
            subscribe,
        } = this.props;

        subscribe('bpmn.modeler.configure', (event) => {

          const {
            tab,
            middlewares
          } = event;

          middlewares.push(addModule(TagJSON, CustomRenderer));
        });

        subscribe('bpmn.modeler.created', (event) => {
                  const {
                    modeler,
                  } = event;

                  this.setState({ 
                    camundaVersion: document.querySelector('[title="Toggle version info"]').innerText.substring(0, 1)
                   });

                  //Setting database connection
                  const db = new Dexie('TagDatabase');
                    db.version(2).stores({
                        tags: "++id, &name, *elements, type",
                        bpmn: '++id, bpmn, name, parent',
                        vocabulary: '++id, &idTag, *inputs'
                    });

                  modeler.on('propertiesPanel.attach', e => {
                    let activeTab;
                    document.getElementsByClassName('tab--active')[0] ? activeTab = document.getElementsByClassName('tab--active')[0].dataset.tabId : activeTab = document.getElementsByClassName('tab active')[0].dataset.tabId;
                     console.log('activeTab', activeTab);
                    
                    if(activeTab != this.state.active){
                        this.setState({
                                active: activeTab,
                                modeler: modeler
                            });
                    }

                    //Check inserted tags
                    const attachRegistry = modeler.get('elementRegistry').getAll();
                    attachRegistry.forEach(attachElement => {

                        if(attachElement.businessObject.extensionElements){
                            const tags = attachElement.businessObject.extensionElements.values.filter(e => e.$type === 'tag:Tag');
                            const type = attachElement.type;

                            if(tags.length > 0){
                                db.transaction('r', db.tags, () => {
                                    db.tags.where('elements').equalsIgnoreCase(type).toArray().then(array => {
                                        const list = array;

                                        const elementRegistry = modeler.get('elementRegistry');
                                        const element = elementRegistry.get(attachElement.id);
                                        const moddle = modeler.get('moddle');
                                        const extensionElements = moddle.create("bpmn:ExtensionElements");
                                        const otherTags = attachElement.businessObject.extensionElements.values.filter(e => e.$type !== 'tag:Tag');
                                        
                                        otherTags.length > 0 && otherTags.forEach(other => {
                                            extensionElements.get("values").push(other);
                                        });

                                        tags.forEach(tagel => {
                                            if(list.filter(list_item => list_item.id == tagel.id).length > 0){
                                                const newtag = moddle.create('tag:Tag');
                                                newtag.id = tagel.id;
                                                newtag.name = list.find(list_item => list_item.id == tagel.id).name;
                                                newtag.value = tagel.value;
                                                extensionElements.get("values").push(newtag);
                                            }
                                        });

                                        modeler.get('modeling').updateProperties(element, {
                                          extensionElements
                                        });

                                    });
                                }).catch (function (e) {
                                    console.error(e.stack);
                                });
                            } 
                        }

                    });
                    

                  });
                
                  modeler.on('propertiesPanel.detach', e => {
                    this.setState({
                                active: '',
                                modeler: ''
                            });
                  });

                  modeler.on('selection.changed', _event => {
                    if(_event.newSelection.length > 0){
                      this.setState({ selected_element: _event.newSelection[0].id });
                    } else {
                        this.setState({ selected_element: defaultButtonText });
                    }          

                  });
                                  
                    modeler.on('commandStack.shape.replace.postExecute', ev => {
                        if(ev.context.newShape.businessObject.extensionElements){
                            const tags = ev.context.newShape.businessObject.extensionElements.values.filter(e => e.$type === 'tag:Tag');
                            const type = ev.context.newShape.type;

                            if(tags.length > 0){
                                db.transaction('r', db.tags, () => {
                                    db.tags.where('elements').equalsIgnoreCase(type).toArray().then(array => {
                                        const list = array;

                                        const elementRegistry = modeler.get('elementRegistry');
                                        const element = elementRegistry.get(ev.context.newShape.id);
                                        const moddle = modeler.get('moddle');
                                        const extensionElements = moddle.create("bpmn:ExtensionElements");
                                        const otherTags = ev.context.newShape.businessObject.extensionElements.values.filter(e => e.$type !== 'tag:Tag');
                                        
                                        otherTags.length > 0 && otherTags.forEach(other => {
                                            extensionElements.get("values").push(other);
                                        });

                                        tags.forEach(tagel => {
                                            if(list.filter(list_item => list_item.id == tagel.id).length > 0){
                                                const newtag = moddle.create('tag:Tag');
                                                newtag.id = tagel.id;
                                                newtag.name = tagel.name;
                                                newtag.value = tagel.value;
                                                extensionElements.get("values").push(newtag);
                                            }
                                        });

                                        modeler.get('modeling').updateProperties(element, {
                                          extensionElements
                                        });

                                    });
                                }).catch (function (e) {
                                    console.error(e.stack);
                                });
                            } 
                        }
                    });

                  modeler.on('element.changed', ev => {
                    if(active){
                        if(ev.element.type === 'bpmn:Participant' && ev.element.children.filter(e => e.type === 'bpmn:Lane').length > 0)
                        {
                            active = false;
                            let nelements = 0;
                            if(ev.element.businessObject.extensionElements && ev.element.businessObject.extensionElements.values.filter(e => e.$type === 'tag:Tag').length > 0){
                                nelements = ev.element.businessObject.extensionElements.values.filter(e => e.$type === 'tag:Tag').length;   
                            }
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            context.font = '8px Arial';
                            const newheight = nelements !== 0 ? 8*1.2*nelements + 20 : 0;

                            ev.element.children.filter(e => e.type === 'bpmn:Lane').length > 0 && 
                            ev.element.children.filter(e => e.type === 'bpmn:Lane').forEach(e => {
                                const lane = modeler.get('elementRegistry').get(e.id);
                                lane.x = ev.element.x + 30 + newheight;
                                modeler.get('modeling').updateProperties(lane, {
                                  x: ev.element.x + 30 + newheight
                                });
                            });
                            active = true;
                        } else if(ev.element.type && ev.element.type === 'bpmn:Lane' && ev.element.parent && ev.element.parent.type === 'bpmn:Participant'){
                            active = false;
                            let nelements = 0;
                            if(ev.element.parent.businessObject.extensionElements && ev.element.parent.businessObject.extensionElements.values.filter(e => e.$type === 'tag:Tag').length > 0){
                                nelements = ev.element.parent.businessObject.extensionElements.values.filter(e => e.$type === 'tag:Tag').length;   
                            }
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            context.font = '8px Arial';
                            const newheight = nelements !== 0 ? 8*1.2*nelements + 20 : 0;
                            const lane = modeler.get('elementRegistry').get(ev.element.id);
                                lane.x = ev.element.parent.x + 30 + newheight;
                                modeler.get('modeling').updateProperties(lane, {
                                  x: ev.element.parent.x + 30 + newheight
                                });
                            active = true;
                        }
                    }
                  });


                  modeler.on('saveXML.start', (event) => {
                    const {
                      definitions,
                      tab
                    } = event;
                  });
            });
    }

    handleSelectedElement(event){
        event.persist();
        if(event.target.id !== defaultButtonText){
            this.setState({ modalOpen: true});
        }
    }

    handleClosed() {
        this.setState({...this.state, modalOpen: false});
        const modeling = this.state.modeler.get('modeling');
        
        this.state.updateTag.forEach(el => {

            if(el.action === 'ADD'){
                const elementRegistry = this.state.modeler.get('elementRegistry');
                const element = elementRegistry.get(el.element);
                const moddle = this.state.modeler.get('moddle');
                const extensionElements = element.businessObject.extensionElements ? element.businessObject.extensionElements : moddle.create("bpmn:ExtensionElements");

                const tag = moddle.create('tag:Tag');
                tag.id = el.row.id;
                tag.name = el.row.name;
                tag.value = el.row.value;
                extensionElements.get("values").push(tag);

                const modeling = this.state.modeler.get('modeling');
                modeling.updateProperties(element, {
                  extensionElements
                });
            } else if(el.action === 'REMOVE'){

                const delete_id = el.row;
                const elementRegistry = this.state.modeler.get('elementRegistry');
                const element = elementRegistry.get(el.element);
                const extensionElements = element.businessObject.extensionElements;

                const values = extensionElements.values.filter(elem => elem.$type !== 'tag:Tag' || (elem.$type === "tag:Tag" && elem.id != delete_id));
                extensionElements.values = values;
                this.state.modeler.get('modeling').updateProperties(element, {
                  extensionElements
                });
            }
        });


        
        this.setState({updateTag: []});
    }

    handleUpdateTag(action, element, oldrow){
        const row = {action: action, element: element, row: oldrow};
        this.setState(prevState => ({ updateTag: [...prevState.updateTag, row]}));
    }

    handleExport(){
        if(this.state.modeler){
            const elementRegistry = this.state.modeler.get('elementRegistry');
            
            const xls_pages = [];
            let xls_data = [];
            const xls_tasks = [];
            const numbers = elementRegistry.getAll().filter(element => element.businessObject.extensionElements && element.type === "bpmn:Participant");
            
            const xls_predata = elementRegistry.getAll().filter(element => element.businessObject.extensionElements && element.type === "bpmn:Participant").forEach(element => {
                                                
                                                
                                                element.businessObject.extensionElements.values.filter(inner => inner.$type === 'tag:Tag').forEach(inner => {
                                                    xls_data.push({
                                                        participant: '',
                                                        name: element.businessObject.name ? element.businessObject.name : '',
                                                        id: element.id,
                                                        type: element.type,
                                                        tag: inner.name,
                                                        value: inner.value
                                                    });
                                                });


                                                element.children.filter(innerElement => innerElement.businessObject.extensionElements && innerElement.businessObject.extensionElements.values.filter(inner => inner.$type === 'tag:Tag').length > 0).forEach(innerElement => {
                                                    innerElement.businessObject.extensionElements.values.filter(inner => inner.$type === 'tag:Tag').forEach(inner => {
                                                        xls_data.push({
                                                            participant: element.businessObject.name ? element.businessObject.name : '',
                                                            name: innerElement.businessObject.name ? innerElement.businessObject.name : '',
                                                            id: innerElement.id,
                                                            type: innerElement.type,
                                                            tag: inner.name,
                                                            value: inner.value
                                                        });
                                                        xls_tasks.push({
                                                            participant: element.businessObject.name ? element.businessObject.name : '',
                                                            name: innerElement.businessObject.name ? innerElement.businessObject.name : '',
                                                            id: innerElement.id,
                                                            type: innerElement.type,
                                                            tag: inner.name,
                                                            value: inner.value
                                                        });
                                                    })
                                                });
                                                const valueToPush = new Array();
                                                valueToPush[0] = element.businessObject.name;
                                                valueToPush[1] = xls_data;
                                                xls_pages.push(valueToPush);
                                                xls_data = [];
                                            });
            const valueToPush = new Array();
            valueToPush[0] = 'Tasks';
            valueToPush[1] = xls_tasks;
            xls_pages.push(valueToPush);

            const pages = xls_pages.map(element => (
                        <ExcelSheet data={element[1]} name={element[0]}>
                            <ExcelColumn label="Name" value="name"/>
                            <ExcelColumn label="id" value="id"/>
                            <ExcelColumn label="Type" value="type"/>
                            <ExcelColumn label="Participant" value="participant"/>
                            <ExcelColumn label="Tag" value="tag"/>
                            <ExcelColumn label="Value" value="value"/>
                        </ExcelSheet>
                    ));

            ReactDOM.render(<ExcelFile hideElement={true}>           
                    {pages}
                </ExcelFile>, document.getElementById('export-button'));
            ReactDOM.render('', document.getElementById('export-button'));
        }
    }

    render() {
        return <Fragment>
           <Fill slot="toolbar" group="9_tags">            
                <button disabled={!this.state.modeler} onClick={this.handleSelectedElement} id={this.state.selected_element}> {this.state.selected_element} </button>
                <button disabled={!this.state.modeler} onClick={this.handleExport} >Export Data</button>
                <span id='export-button'></span>
            {this.state.modalOpen && <ConfigModal onClose={this.handleClosed} selected_element={this.state.selected_element} modeler={this.state.modeler} handleUpdateTag={this.handleUpdateTag} />}
            </Fill>
            <Fill slot="tab-actions" group="9_tags">            
                <button disabled={!this.state.modeler} onClick={this.handleSelectedElement} id={this.state.selected_element}> {this.state.selected_element} </button>
                <button disabled={!this.state.modeler} onClick={this.handleExport} >Export Data</button>
                <span id='export-button'></span>
            {this.state.modalOpen && <ConfigModal onClose={this.handleClosed} selected_element={this.state.selected_element} modeler={this.state.modeler} handleUpdateTag={this.handleUpdateTag} />}
            </Fill>
        </Fragment>

    }
}
/**
 * Returns a bpmn.modeler.configure middleware
 * that adds the specific module.
 *
 * @param {didi.Module} extensionModule
 *
 * @return {Function}
 */
function addModule(extensionModule, additionalModule1) {

  return (config) => {

    const additionalModules = config.additionalModules || [];
    const moddleExtensions = config.moddleExtensions || [];

    return {
      ...config,
      additionalModules: [
        ...additionalModules,
        additionalModule1,
      ],
      moddleExtensions: [
        ...moddleExtensions,
        extensionModule
      ]
    };
  };
}


