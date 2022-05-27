import React, {Fragment, PureComponent} from 'camunda-modeler-plugin-helpers/react';
import Dexie from 'dexie';
import css from './TagElements.css';

const headerColumns = ['Name', 'Value', 'Action'];

export default class TagElements extends PureComponent {

constructor(props) {
        super(props);

        this.state = {
                taglist: [],
                tagelements: [],
                focus: false,
                new_select: 0,
                new_text: '',
                select_list: [],
                newrow_boolean: 'True',
                newrow_vocabulary: '', 
                vocabularylist: []
        }

        this.handleAddRow = this.handleAddRow.bind(this);
        this.handleDeleteRow = this.handleDeleteRow.bind(this);
        this.handleTagFinished = this.handleTagFinished.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleOnChange = this.handleOnChange.bind(this);
        this.handleChangeSelect = this.handleChangeSelect.bind(this);

        this.saveButton = React.createRef();
    }

handleAddRow(event){
        event.persist();

        if(this.state.tagelements.filter(e => e.id == this.state.new_select).length === 0){
                let selected_id = 0;
                this.state.new_select === 0 ? selected_id = this.state.taglist.filter(e => this.state.tagelements.filter(tgel => e.id == tgel.id).length === 0)[0].id : selected_id = this.state.new_select;
                let selected_text = '';
                const typetag = this.state.taglist.find(e => e.id == selected_id).type;
                if(typetag === 'Boolean'){
                        selected_text = this.state.newrow_boolean;
                } else if(typetag === 'Vocabulary'){
                        this.state.newrow_vocabulary === '' ? selected_text = this.state.vocabularylist.find(item => item.idTag == selected_id).inputs[0] : selected_text = this.state.newrow_vocabulary;
                } else if(typetag === 'Text'){
                        selected_text = this.state.new_text
                        if(this.state.vocabularylist.find(item => item.idTag == selected_id).inputs.filter(item => item.toLowerCase() === selected_text.toLowerCase()).length === 0){
                                const temp_index = this.state.vocabularylist.findIndex(item => item.idTag == selected_id);
                                const temp_vocabulary = this.state.vocabularylist;
                                temp_vocabulary[temp_index].inputs.push(selected_text);
                                this.setState({ vocabularylist: temp_vocabulary });

                                const db = new Dexie('TagDatabase');
                                db.version(2).stores({
                                        tags: "++id, &name, *elements, type",
                                        bpmn: '++id, bpmn, name, parent',
                                        vocabulary: '++id, &idTag, *inputs'
                                    });
                                db.transaction('rw', db.vocabulary, () => {
                                    db.vocabulary.where('idTag').equals(parseInt(selected_id)).modify({inputs: temp_vocabulary[temp_index].inputs});
                                }).catch (function (e) {
                                    console.error(e.stack);
                                });
                        }
                } else {
                        selected_text = this.state.new_text
                }

                if(selected_text.trim() !== ''){
                        const row = {id: selected_id, 
                                name: this.state.taglist.find(item => item.id == selected_id).name, 
                                value: selected_text};
                        
                        this.setState(prevState => ({ tagelements: [...prevState.tagelements, row] }));

                        this.setState({ 
                                new_select: 0,
                                new_text: '',
                                newrow_boolean: 'True',
                                newrow_vocabulary: ''
                        });

                        this.props.handleUpdateTag('ADD', this.props.selected_element, row);
                } else {
                        alert('Value field is empty!')

                        this.setState({ 
                                new_select: 0,
                                new_text: '',
                                newrow_boolean: 'True',
                                newrow_vocabulary: ''
                        });
                }

        }
        this.props.handleRemoveAdd();
}

handleDeleteRow = (event, index) => {
        event.persist();
        const delete_id = this.state.tagelements[index].id;

        const elementRegistry = this.props.modeler.get('elementRegistry');
        const element = elementRegistry.get(this.props.selected_element);
        const extensionElements = element.businessObject.extensionElements;

        this.props.handleUpdateTag('REMOVE', this.props.selected_element, delete_id);

        const temp = this.state.tagelements.filter((e, counter) => counter !== index);
        this.setState({ tagelements: temp });
}

handleTagFinished(){
        alert('There are no other tags available for this bpmn element');
        this.props.handleRemoveAdd();
}

handleKeyPress(event){
        if(event.key === 'Enter'){
                this.saveButton.current.click();
        }
}

handleOnChange = event => {
        event.stopPropagation();
        event.persist();
        this.setState({ new_text: event.target.value });
}

handleChangeSelect = event => {
        event.stopPropagation();
        event.persist();
        this.setState({ 
                new_text: '',
                newrow_boolean: 'True',
                newrow_vocabulary: '',
                new_select: event.target.value
        });
}

componentDidMount(){

        const elementRegistry = this.props.modeler.get('elementRegistry');
        const element = elementRegistry.get(this.props.selected_element);

        const db = new Dexie('TagDatabase');
            db.version(2).stores({
                tags: "++id, &name, *elements, type",
                bpmn: '++id, bpmn, name, parent',
                vocabulary: '++id, &idTag, *inputs'
            });
        db.transaction('r', db.tags, db.vocabulary, () => {
            db.tags.where('elements').equalsIgnoreCase(element.type).toArray().then(array => {
                this.setState({ taglist : array });
                console.log('taglist', array);
            });

            db.vocabulary.toArray().then(array => {
                this.setState({ vocabularylist: array });
            })
        }).catch (function (e) {
            console.error(e.stack);
        });

        if(element.businessObject.extensionElements && element.businessObject.extensionElements.values.length > 0){
          const extensionElements = element.businessObject.extensionElements;
          const list = extensionElements.values.filter(el => el.$type === "tag:Tag").map(el => {
                return {id: el.id, name: el.name, value: el.value};
          });
          this.setState({ tagelements: list });
        }
}

render(){  
        let field = '';
        let datalist = '';
        if(this.state.taglist.filter(e => this.state.tagelements.filter(tgel => e.id == tgel.id).length === 0).length > 0){
                let selected_id = 0;
                this.state.new_select === 0 ? selected_id = this.state.taglist.filter(e => this.state.tagelements.filter(tgel => e.id == tgel.id).length === 0)[0].id : selected_id = this.state.new_select;
                switch(this.state.taglist.find(e => e.id == selected_id).type){
                        case "Boolean":
                                field = <select className="select-cell" onChange={(event) => this.setState({ newrow_boolean: event.target.value })}>
                                                <option value='True'>True</option>
                                                <option value='False'>False</option>
                                        </select>;
                                break;
                        case "Numeric":
                                field = <input className="select-cell" type="number" placeholder="value" onChange={this.handleOnChange} onKeyPress={this.handleKeyPress} />;
                                break;
                        case "Vocabulary":
                                    field = <select className="select-cell" onChange={(event) => this.setState({ newrow_vocabulary: event.target.value })}>
                                                {this.state.vocabularylist.find(item => item.idTag == selected_id).inputs.map(item => <option value={item}>{item}</option>)}
                                                </select>;
                                break;
                        default: 
                                
                                field = <input className="select-cell" list="text-inputs-datalist" type="text" placeholder="value" onChange={this.handleOnChange} onKeyPress={this.handleKeyPress}/>;
                                datalist = <datalist id="text-inputs-datalist">
                                                {this.state.vocabularylist.find(item => item.idTag == selected_id).inputs.map(item => <option value={item}/>)}
                                        </datalist>;
                }
        }
	   return(
                <div>
                        <div className="tagelements">
                                <div className="select-row-header">
                                        <span className="select-header">Name</span>
                                        <span className="select-header">Value</span>
                                        <span className="select-header">Action</span>
                                </div>

                                {this.state.tagelements.map((el, index) => 
                                        <span className="select-row">
                                                <span className="select-cell">{el.name}</span>
                                                <span className="select-cell">{el.value}</span>
                                                <input className="select-cell" type="button" style={{cursor: 'pointer'}} value="&#9003; Delete row" onClick={(event) => this.handleDeleteRow(event, index)}/>
                                        </span>)}
                                {this.props.addTag && (this.state.taglist.filter(e => this.state.tagelements.filter(tgel => e.id == tgel.id).length === 0).length > 0 ?
                                        <span className="select-row">                                        
                                                        <select className="select-cell" onChange={this.handleChangeSelect} >
                                                                {this.state.taglist.filter(e => this.state.tagelements.filter(tgel => e.id == tgel.id).length === 0).map(e => (<option value={e.id}>{e.name}</option>))}
                                                        </select>
                                                
                                                
                                                        {field}
                                                        {datalist}
                                                
                                                
                                                        <input className="select-cell" type="button" style={{cursor: 'pointer'}} ref={this.saveButton} onClick={this.handleAddRow} value="Save row"/>
                                                
                                        </span> : this.handleTagFinished())}    
                        </div>
                </div>
                );
	}
}