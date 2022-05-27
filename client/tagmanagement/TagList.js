import React, {Fragment, PureComponent} from 'camunda-modeler-plugin-helpers/react';
import css from './TagList.css'

export default class TagList extends PureComponent {

constructor(props) {
        super(props);

        // this.handleAddTag = this.handleAddTag.bind(this);
        // this.handleTagList = this.handleTagList.bind(this);
        this.handleSelect = this.handleSelect.bind(this);
    }

handleSelect(event){
        event.persist();
        console.log(event);
        this.props.handleSelectionTag(event.target.id);
}

render(){
	
    // Object.keys(this.props.taglist).forEach(index => (list.push(<p><button type="button">{this.props.taglist[index]['name']}</button></p>)));
	return(
                <div className="container">
                  <div className="items">
                    <div className="items-body">
                      {/*{Object.keys(this.props.taglist).map(index => <div className="items-body-content" id={index} onClick={this.handleSelect} >
                                                        <span id={index}>{this.props.taglist[index]['name']}</span>
                                                        <i class="fa fa-angle-right" id={index}>></i>
                                                        </div>)}*/}
                        {this.props.taglist.map(el => <div className="items-body-content" id={el.id} onClick={this.handleSelect} >
                                                        <span id={el.id}>{el.name}</span>
                                                        <i class="fa fa-angle-right" id={el.id}>></i>
                                                        </div>)}
                    </div>
                  </div>
                </div>
		);
	}
}