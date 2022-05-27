import React, {Fragment, PureComponent} from 'camunda-modeler-plugin-helpers/react';
import {Modal} from 'camunda-modeler-plugin-helpers/components';
import TagElements from './TagElements';

const Title = Modal.Title || (({children}) => <h2> {children} </h2>);
const Body = Modal.Body || (({children}) => <div>{children}</div>);
const Footer = Modal.Footer || (({children}) => <div>{children}</div>);


export default class ConfigModal extends PureComponent {
constructor(props) {
        super(props);

        this.state = {
              addTag: false,
            }

        this.handleAddTag = this.handleAddTag.bind(this);
        this.handleRemoveAdd = this.handleRemoveAdd.bind(this);
    }

handleAddTag(){
    this.setState({
        addTag: true
    });
}

handleRemoveAdd(){
    this.setState({
        addTag:false,
    })
}

render(){ 

    
    return (
        <Modal onClose={this.props.onClose}>
            <Title>
                Tags for: {this.props.selected_element}
            </Title>
            <Body>
                <div>
                    <TagElements selected_element={this.props.selected_element} addTag={this.state.addTag} handleRemoveAdd={this.handleRemoveAdd} modeler={this.props.modeler} handleUpdateTag={this.props.handleUpdateTag}/>
                </div>                         
            </Body>
            <Footer>
                <div id="languageChangeButton">
                    <button type="button" class="btn btn-primary" disabled={this.state.addTag} onClick={this.handleAddTag}> Add Tag </button>
                    <button type="button" class="btn btn-primary" onClick={this.props.onClose}>Return to Modeler</button>
                </div>
            </Footer>
        </Modal>
    );
    }   
}
