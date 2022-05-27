import React, {Fragment, PureComponent} from 'camunda-modeler-plugin-helpers/react';
import {Modal} from 'camunda-modeler-plugin-helpers/components';
import TagList from './TagList';
import NewTag from './NewTag';
import SelectedTag from  './SelectedTag';

const Title = Modal.Title || (({children}) => <h2> {children} </h2>);
const Body = Modal.Body || (({children}) => <div>{children}</div>);
const Footer = Modal.Footer || (({children}) => <div>{children}</div>);
import Dexie from 'dexie';

export default class ConfigModal extends PureComponent {
constructor(props) {
        super(props);

        this.state = {
              taglist:[],
              bpmnelements: [],
              buttonList: true,
              flag : 1,
              showTag: false,
              showDelete: false,
              showEdit: false,
              tagSaving: false,
              tagDeleting: false,
              selectedIndex: ''
            }

        this.handleAddTag = this.handleAddTag.bind(this);
        this.handleTagList = this.handleTagList.bind(this);
        this.handlePushTag = this.handlePushTag.bind(this);
        this.handleSaveTag = this.handleSaveTag.bind(this);
        this.handleTagSaving = this.handleTagSaving.bind(this);
        this.handleRemoveSaving = this.handleRemoveSaving.bind(this);
        this.handleSelectionTag = this.handleSelectionTag.bind(this);
        this.handleTagDelete = this.handleTagDelete.bind(this);
        this.handleTagEdit = this.handleTagEdit.bind(this);
        this.handleTagDeleteReturn = this.handleTagDeleteReturn.bind(this);    
}

handleTagList(){
    this.setState({
        buttonList: true,
        flag: 1,
        showTag: false,
        showDelete: false,
        showEdit: false,
    });
}

handleAddTag(){
    this.setState({
        buttonList: false,
        flag: 2,
        showTag: true,
        showDelete: false,
        showEdit: false,
    })
}

handlePushTag(flag, item){
    if(flag){
        this.setState(prevState => ({ 
            taglist: [...prevState.taglist.filter(e => e.id != parseInt(this.state.selectedIndex)), item].sort((a,b) => a.id - b.id),
            buttonList: false,
            flag: 3,
            showTag: false,
            showDelete: true,
            showEdit: true,
        }));
        if(this.props.modeler){
            updateTags(this.props.modeler, 2, this.state.selectedIndex);
        }
    } else {
        this.setState(prevState => ({ 
            taglist: [...prevState.taglist, item] 
        }));
    }
}

handleSaveTag(){
    this.setState({
        buttonList: false,
        flag: 1,
        showTag: false,
        showDelete: false,
        showEdit: false,
    })
}

handleTagSaving(){
    this.setState({
        tagSaving: true
    })
}

handleRemoveSaving(){
        this.setState({
        tagSaving: false
    })
}

handleSelectionTag(tag){
    this.setState({
        buttonList: false,
        flag: 3,
        showTag: false,
        selectedIndex: tag,
        showDelete: true,
        showEdit: true,
    })
}

handleTagDelete(){
    this.setState({ tagDeleting: true });
}

handleTagEdit(){
    this.setState({
        buttonList: false,
        flag: 4,
        showTag: true,
        showDelete: false,
        showEdit: false,
    })
}

handleTagDeleteReturn(){

        const db = new Dexie('TagDatabase');
        db.version(2).stores({
            tags: "++id, &name, *elements, type",
            bpmn: '++id, bpmn, name, parent',
            vocabulary: '++id, &idTag, *inputs'
        });
        db.transaction('rw', db.tags, db.vocabulary, () => {

            db.tags.where('id').equals(parseInt(this.state.selectedIndex)).delete().then(() => {
                alert('Tag eliminato dal database!');

                const type_selectedTag = this.state.taglist.find(el => el.id == this.state.selectedIndex);
                console.log('taglist element', this.state.taglist.find(el => el.id == this.state.selectedIndex));
                console.log('type', type_selectedTag);
                if(type_selectedTag.type === 'Vocabulary' || type_selectedTag.type === 'Text'){
                    db.vocabulary.where('idTag').equals(type_selectedTag.id).delete();
                }   

                this.setState(prevState => ({ 
                    tagDeleting: false,
                    showDelete: false,
                    showEdit: false,
                    buttonList: true,
                    flag: 1,
                    taglist: prevState.taglist.filter(element => element.id != this.state.selectedIndex)
                }));

                if(this.props.modeler){
                    updateTags(this.props.modeler, 1, this.state.selectedIndex);
                }
            });
        }).catch (function (e) {
            console.error(e.stack);
        });
}

componentDidMount(){
        const db = new Dexie('TagDatabase');
        db.version(2).stores({
            tags: '++id, &name, *elements, type',
            bpmn: '++id, bpmn, name, parent',
            vocabulary: '++id, &idTag, *inputs'
        });

        db.transaction('r', db.tags, db.bpmn, () => {

            db.tags.toArray().then((array) => {
                //console.log('toArray()', array);
                this.setState({ taglist: array});
            });

            db.bpmn.toArray().then((array) => {
                //console.log('toArray()', array);
                this.setState({ bpmnelements: array});
            });

        }).catch (function (e) {
            console.error(e.stack);
        });
}

render(){ 

    let view = '';
    switch(this.state.flag){
                    case 1:
                        view = <TagList taglist={this.state.taglist} handleSelectionTag={this.handleSelectionTag} />;
                        break;
                    case 2:
                        view = <NewTag taglist={this.state.taglist} bpmnelements={this.state.bpmnelements} handlePushTag={this.handlePushTag} handleSaveTag={this.handleSaveTag} handleRemoveSaving={this.handleRemoveSaving} tagsaving={this.state.tagSaving}/>;
                        break;
                    case 3:
                        view = <SelectedTag taglist={this.state.taglist} selectedTag={this.state.taglist.find(el => el.id === parseInt(this.state.selectedIndex))} tagDeleting={this.state.tagDeleting} handleTagDeleteReturn={this.handleTagDeleteReturn}/>;
                        break;
                    case 4:
                        view = <NewTag taglist={this.state.taglist} bpmnelements={this.state.bpmnelements} handlePushTag={this.handlePushTag} handleSaveTag={this.handleSaveTag} handleRemoveSaving={this.handleRemoveSaving} tagsaving={this.state.tagSaving} selectedTag={this.state.taglist.find(el => el.id == this.state.selectedIndex)}/>;
                        break;
                    default:
                        view = <TagList taglist={this.state.taglist} />;
                }

    return (
        <Modal onClose={this.props.onClose}>
            <Title>
                Tag Management
            </Title>
            <Body>
                <div>
                    <button type="button" class="btn btn-primary" style={{cursor: 'pointer'}} disabled={this.state.buttonList} onClick={this.handleTagList}>Tag List</button>
                    <button type="button" class="btn btn-primary" style={{cursor: 'pointer'}} onClick={this.handleAddTag}>Add Tag</button>
                </div>

                <div>{view}</div>

               
                
            </Body>
            <Footer>
                <div id="languageChangeButton">
                    <button type="button" class="btn btn-primary" style={{display: this.state.showDelete ? 'inline-block' : 'none', backgroundColor: '#ec4b4b', cursor: 'pointer'}} onClick={this.handleTagDelete}>Delete Tag</button>
                    <button type="button" class="btn btn-primary" style={{display: this.state.showEdit ? 'inline-block' : 'none', cursor: 'pointer'}} onClick={this.handleTagEdit}>&#9998; Edit Tag</button>
                    <button type="button" class="btn btn-primary" style={{display: this.state.showTag ? 'inline-block' : 'none', cursor: 'pointer'}} onClick={this.handleTagSaving}>Save Tag</button>
                    <button type="button" class="btn btn-primary" style={{cursor: 'pointer'}} onClick={this.props.onClose}>Return to Modeler</button>
                </div>
            </Footer>
        </Modal>
    );
    }   
}

function updateTags(modeler, deleteOrUpdate, index){
    //1: delete, 2:update

    const attachRegistry = modeler.get('elementRegistry').getAll();
            attachRegistry.forEach(attachElement => {

                if(attachElement.businessObject.extensionElements){
                    const tags = attachElement.businessObject.extensionElements.values.filter(e => e.$type === 'tag:Tag');
                    const type = attachElement.type;

                    if(tags.length > 0){
                        const db = new Dexie('TagDatabase');

                        db.version(2).stores({
                            tags: "++id, &name, *elements, type",
                            bpmn: '++id, bpmn, name, parent',
                            vocabulary: '++id, &idTag, *inputs'
                        });
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

                                if(deleteOrUpdate === 1){
                                    tags.filter(e => e.id != index).forEach(tagel => {
                                        const newtag = moddle.create('tag:Tag');
                                        newtag.id = tagel.id;
                                        newtag.name = tagel.name;
                                        newtag.value = tagel.value;
                                        extensionElements.get("values").push(newtag);
                                    });
                                } else if(deleteOrUpdate === 2){
                                    tags.forEach(tagel => {
                                        if(tagel.id == index){
                                            const newtag = moddle.create('tag:Tag');
                                            newtag.id = tagel.id;
                                            newtag.name = list.find(list_item => list_item.id == tagel.id).name;
                                            newtag.value = tagel.value;
                                            extensionElements.get("values").push(newtag);
                                        } else {
                                            const newtag = moddle.create('tag:Tag');
                                            newtag.id = tagel.id;
                                            newtag.name = tagel.name;
                                            newtag.value = tagel.value;
                                            extensionElements.get("values").push(newtag);
                                        }
                                    });
                                }

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
                
}

