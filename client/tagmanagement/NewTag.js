import React, {PureComponent} from 'camunda-modeler-plugin-helpers/react';
import Dexie from 'dexie';
import css from './NewTag.css';
import {Modal} from 'camunda-modeler-plugin-helpers/components';

const Title = Modal.Title || (({children}) => <h2> {children} </h2>);
const Body = Modal.Body || (({children}) => <div>{children}</div>);
const Footer = Modal.Footer || (({children}) => <div>{children}</div>);

export default class NewTag extends PureComponent {

constructor(props) {
        super(props);

        this.state = {
              checks: [],
              left: '',
              selecttype: 'Boolean',
              checkboxes: [],
              realcheckboxes: [],
              vocabularyInputs: [],
              textInputs: [],
              input: ''
            };

        this.handleChangeInput = this.handleChangeInput.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleChangeSelect = this.handleChangeSelect.bind(this);
        this.handleNewVocabularyInput = this.handleNewVocabularyInput.bind(this);
        this.handleNewRowVocabulary =  this.handleNewRowVocabulary.bind(this);
        this.handleDeleteRowVocabulary = this.handleDeleteRowVocabulary.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);

        this.plusButton = React.createRef();
    }

handleChangeInput = event => {
        event.stopPropagation();
        event.persist();
        const target = event.target;
        const name = target.id;
        if(target.type === 'checkbox'){
                const old = this.state.realcheckboxes;
                old[target.id].checked = !old[target.id].checked;
                this.setState({
                   realcheckboxes: old
                });
        } else {
                this.setState({ left: target.value });
        }
}

handleChangeSelect = (event) => {
        this.setState({ selecttype: event.target.value });
}

handleNewVocabularyInput = (event) => {
        this.setState({ input: event.target.value });
}

handleNewRowVocabulary = () => {
        if(this.state.input.trim() !== '' && this.state.vocabularyInputs.filter(e => e.toLowerCase() === this.state.input.trim().toLowerCase()).length === 0){
                this.setState(prevState => ({ 
                        vocabularyInputs: [...prevState.vocabularyInputs, prevState.input.trim()],
                        input: ''
                 }));
                this.refs.inputtext.value = '';
        } else {
                alert('Empty field or input alreaxy exists!');
        }
}

handleKeyPress(event){
        if(event.key === 'Enter'){
                this.plusButton.current.click();
        }
}

handleDeleteRowVocabulary = (event, index) => {
        event.stopPropagation();
        event.persist();
        this.setState(prevState => ({ vocabularyInputs: prevState.vocabularyInputs.filter((e, i) => i !== index)}));
}

handleSubmit(){
        this.props.handleRemoveSaving();
        if(this.state.left.trim() !== ''){

                //SEARCH FOR OCCURRENCES IN this.props.taglist
                let flag = false;
                if(this.props.selectedTag){
                        flag = true;
                }

                if(!(flag && this.state.left.trim() === this.props.selectedTag.name) && this.props.taglist.filter(el => el.name.toLowerCase() === this.state.left.trim().toLowerCase()).length > 0){
                        alert('Tag already exists in database!')
                } else {
                        if(this.state.realcheckboxes.filter(e => e.checked).length > 0){

                                if(this.state.selecttype === 'Vocabulary' && this.state.vocabularyInputs.length === 0){
                                        alert('Insert at least one item in the vocabulary list!')
                                } else {
                                        const db = new Dexie('TagDatabase');
                                        db.version(2).stores({
                                                tags: "++id, &name, *elements, type",
                                                bpmn: '++id, bpmn, name, parent',
                                                vocabulary: '++id, &idTag, *inputs'
                                        });

                                db.transaction('rw', db.tags, db.vocabulary, () => {
                                        
                                        const elements = [];
                                        this.state.realcheckboxes.filter(real => real.checked).forEach(real => {
                                                if(this.props.bpmnelements.filter(bpmn => bpmn.parent === real.name).length > 0){
                                                        this.props.bpmnelements.filter(bpmn => bpmn.parent === real.name).forEach(bpmn => {
                                                                elements.push(bpmn.bpmn);
                                                        });
                                                } else {
                                                        elements.push(this.props.bpmnelements.find(bpmn => real.name === bpmn.name).bpmn);
                                                }
                                        });

                                        if(flag){
                                                db.tags.put({
                                                        id: this.props.selectedTag.id,
                                                        name: this.state.left.trim(),
                                                        elements: elements,
                                                        type: this.state.selecttype
                                                }).then(() => {
                                                        alert('Tag updated successfully!');
                                                        const newItem = {name: this.state.left.trim(), elements: elements, type: this.state.selecttype, id: this.props.selectedTag.id};

                                                        if((this.props.selectedTag.type === 'Vocabulary' || this.props.selectedTag.type === 'Text') && (this.state.selecttype === 'Boolean' || this.state.selecttype === 'Numeric')){
                                                                db.vocabulary.where('idTag').equals(this.props.selectedTag.id).delete();
                                                        } else if((this.state.selecttype === 'Vocabulary' || this.state.selecttype === 'Text') && (this.props.selectedTag.type === 'Vocabulary' || this.props.selectedTag.type === 'Text')) {
                                                                db.vocabulary.where('idTag').equals(this.props.selectedTag.id).modify({inputs: this.state.vocabularyInputs});
                                                        } else if((this.state.selecttype === 'Vocabulary' || this.state.selecttype === 'Text') && (this.props.selectedTag.type === 'Boolean' || this.props.selectedTag.type === 'Numeric')) {
                                                                db.vocabulary.add({idTag: this.props.selectedTag.id, inputs: this.state.vocabularyInputs});
                                                        }

                                                        this.props.handlePushTag(flag, newItem);
                                                });
                                        } else {
                                                db.tags.add({
                                                        name: this.state.left.trim(),
                                                        elements: elements,
                                                        type: this.state.selecttype
                                                }).then(key => {
                                                        console.log('key', key);
                                                        alert("Tag saved in the database!");
                                                        const newItem = {name: this.state.left.trim(), elements: elements, type: this.state.selecttype, id: key};

                                                        if(this.state.selecttype === 'Vocabulary' || this.state.selecttype === 'Text'){
                                                                db.vocabulary.add({idTag: key, inputs: this.state.vocabularyInputs});
                                                        }
                                                        this.props.handlePushTag(flag, newItem);
                                                        this.props.handleSaveTag();
                                                });
                                        }
                                        
                                }).catch(error => {
                                        console.log('error dexie', error);
                                });
                                }
                        } else {
                                alert('Select at least one bpmn element');
                        }
                }
        } else {
                alert('Name field is empty!')
        }      
}

componentDidMount(){
        if(this.props.selectedTag){
                if(this.props.selectedTag.type === 'Vocabulary' || this.props.selectedTag.type === 'Text'){

                        const db = new Dexie('TagDatabase');
                        db.version(2).stores({
                            tags: '++id, &name, *elements, type',
                            bpmn: '++id, bpmn, name, parent',
                            vocabulary: '++id, &idTag, *inputs'
                        });

                        db.transaction('r', db.vocabulary, () => {
                            db.vocabulary.get({idTag: this.props.selectedTag.id}).then((array) => {
                                this.setState({ 
                                        left: this.props.selectedTag.name, 
                                        selecttype: this.props.selectedTag.type,
                                        vocabularyInputs: array ? array.inputs : []
                                });
                            });
                        }).catch (function (e) {
                            console.error(e.stack);
                            this.setState({ 
                                left: this.props.selectedTag.name, 
                                selecttype: this.props.selectedTag.type
                                });
                        });
                } else {
                        this.setState({ 
                                left: this.props.selectedTag.name, 
                                selecttype: this.props.selectedTag.type
                        });
                }
        }

        //NEW
        const realcheckboxes = [];
        this.props.bpmnelements.forEach((element, index) => {
                const bpmnelement = {index: index, bpmn: element.bpmn, name: element.name, parent: element.parent, checked: this.props.selectedTag ? this.props.selectedTag.elements.includes(element.bpmn) : false};
                if(element.parent && realcheckboxes.filter(e => e.name === element.parent).length === 0){
                        realcheckboxes.push({name: element.parent, checked: this.props.selectedTag ? this.props.selectedTag.elements.includes(element.bpmn) : false});
                } else if(!element.parent){
                        realcheckboxes.push({name: element.name, checked: this.props.selectedTag ? this.props.selectedTag.elements.includes(element.bpmn) : false});
                }
                this.setState(prevState => ({
                        checkboxes: [...prevState.checkboxes, bpmnelement]
                }));
        });
        this.setState({
                realcheckboxes: realcheckboxes
        })
}

render(){

        // const list = [];
        // this.props.bpmnelements.forEach(element => (list.push(<p>
        //         <input className="add-checkbox" type="checkbox" id={element.bpmn} onChange={this.handleChangeInput} name={element.name} defaultChecked={this.props.selectedTag ? this.props.selectedTag.elements.includes(element.bpmn) : false}/>
        //         <label for={element.bpmn}>{element.name}</label></p>)));
        this.props.tagsaving && this.handleSubmit();

        const vocabularyTag = <div>
                                <p><h3>Vocabulary Inputs:</h3></p>
                                <div className="InputAddOn">
                                                <input type="text" className="InputAddOn-field" ref="inputtext" onChange={this.handleNewVocabularyInput} onKeyPress={this.handleKeyPress}/>
                                                <input type="button" className="InputAddOn-item" value="+" style={{cursor: 'pointer'}} ref={this.plusButton} onClick={this.handleNewRowVocabulary}/>
                                </div>
                                <div>
                                        {this.state.vocabularyInputs.map((e, index) => 
                                                <span className="InputAddOnList">
                                                        <span className="InputAddOn-field" style={{backgroundColor: "ghostwhite"}}>{e}</span>
                                                        <input type="button" className="InputAddOn-item" value="-" style={{cursor: 'pointer'}} onClick={(event) => this.handleDeleteRowVocabulary(event, index)}/>
                                                </span>)}
                                </div>
                              </div>;
        const textTag = <div>
                                <p><h3>Suggested Text Inputs:</h3></p>
                                <div className="InputAddOn">
                                                <input type="text" className="InputAddOn-field" ref="inputtext" onChange={this.handleNewVocabularyInput} onKeyPress={this.handleKeyPress}/>
                                                <input type="button" className="InputAddOn-item" value="+" style={{cursor: 'pointer'}} ref={this.plusButton} onClick={this.handleNewRowVocabulary}/>
                                </div>
                                <div>
                                        {this.state.vocabularyInputs.map((e, index) => 
                                                <span className="InputAddOnList">
                                                        <span className="InputAddOn-field" style={{backgroundColor: "ghostwhite"}}>{e}</span>
                                                        <input type="button" className="InputAddOn-item" style={{cursor: 'pointer'}} value="-" onClick={(event) => this.handleDeleteRowVocabulary(event, index)}/>
                                                </span>)}
                                </div>
                      </div>;
        let showType = '';
        switch(this.state.selecttype){
                case 'Vocabulary':
                        showType = vocabularyTag;
                        break;
                case 'Text':
                        showType = textTag;
                        break;
                default: 
                        showType: '';
        }
        
	return(
                <div className="wrapper">
                        <div className="head-row InputAddOn">
                                <span className="InputAddOn-item">Name Tag</span>
                                <input className="InputAddOn-field" type="text" id="left" name="left" onChange={this.handleChangeInput} value={this.state.left} placeholder={this.state.left}/>
                        </div>
                             
                        <div className="form" id="content">        
                                <div className="panel">
                                        {/*this.state.realcheckboxes.map((e, index) => <p>
                                                <input className="add-checkbox" type="checkbox" id={index} onChange={this.handleChangeInput} name={e.name} defaultChecked={e.checked}/>
                                                <label for={e.name}>{e.name}</label>
                                                </p>)*/}
                                        {this.state.realcheckboxes.map((e, index) => 
                                                <span className="InputAddOnList" style={{alignItems: 'center', backgroundColor: 'rgba(147, 128, 108, 0.1)', border: 'solid 0.5px rgba(147, 128, 108, 0.25)', marginBottom: '1px'}}>
                                                        <input className="add-checkbox InputAddOn-item" style={{cursor: 'pointer'}} type="checkbox" id={index} onChange={this.handleChangeInput} name={e.name} defaultChecked={e.checked}/>
                                                        <label className="InputAddOn-field hover-field" style={{cursor: 'pointer', backgroundColor: 'white'}} for={index}>{e.name}</label>
                                                </span>)}
                                </div>
                                <div className="panel">
                                        <div className="InputAddOn">
                                                <span className="InputAddOn-item">Input type</span>
                                                <select className="InputAddOn-field" name="inputType" id="inputType" value={this.state.selecttype} onChange={this.handleChangeSelect}>
                                                        <option value="Boolean">Boolean</option>
                                                        <option value="Numeric">Numeric</option>
                                                        <option value="Vocabulary">Vocabulary</option>
                                                        <option value="Text">Text</option>
                                                </select>

                                        </div> 

                                        {showType}
                                </div>
                        </div>
                </div>
                 
		);
	}
}