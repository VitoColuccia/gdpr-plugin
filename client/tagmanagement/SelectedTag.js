import React, {Fragment, PureComponent} from 'camunda-modeler-plugin-helpers/react';
import css from './NewTag.css';
import Dexie from 'dexie';


export default class SelectedTag extends PureComponent {

constructor(props) {
        super(props);

        this.state = {
              inputs: ''
            };

        // this.handleAddTag = this.handleAddTag.bind(this);
        // this.handleTagList = this.handleTagList.bind(this);
        
    }

componentDidMount(){
        if(this.props.selectedTag.type === 'Vocabulary' || this.props.selectedTag.type === 'Text'){
                const db = new Dexie('TagDatabase');
                db.version(2).stores({
                    tags: '++id, &name, *elements, type',
                    bpmn: '++id, bpmn, name, parent',
                    vocabulary: '++id, &idTag, *inputs'
                });

                db.transaction('r', db.vocabulary, () => {
                    db.vocabulary.get({idTag: this.props.selectedTag.id}).then((array) => {
                        let inputs = [];
                        if(array){
                                inputs = array.inputs.map(e => 
                                <span className="InputAddOnList">
                                        <span className="InputAddOn-field" style={{backgroundColor: "ghostwhite"}}>{e}</span>
                                </span>);
                        }
                        this.setState({ inputs: inputs });
                    });
                }).catch (function (e) {
                    console.error(e.stack);
                });
        }
}

render(){        
        this.props.tagDeleting && this.props.handleTagDeleteReturn();
	return(
		<div className="container">
                        <div className="items">
                                <div className="items-head">
                                      <p>Tag:  {this.props.selectedTag.name}</p>
                                </div>
                                <div id="content">
                                        <div className="items-body panel nomargin">
                                                {this.props.selectedTag.elements.map(e => <div className="items-body-content">{e}</div>)}
                                        </div>
                                        <div className="panel">
                                                <div className="InputAddOn">
                                                        <span className="InputAddOn-item">Type</span>
                                                        <span className="InputAddOn-field" style={{backgroundColor: "ghostwhite"}}>{this.props.selectedTag.type}</span>
                                                </div>

                                                {this.state.inputs}
                                        </div>
                                </div>
                        </div>
                </div>
		);
	}
}