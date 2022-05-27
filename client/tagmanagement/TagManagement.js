import React, {Fragment, PureComponent} from 'camunda-modeler-plugin-helpers/react';
import {Fill} from 'camunda-modeler-plugin-helpers/components';
import Select from 'react-select';
import ConfigModal from "./ConfigModal";
import Dexie from 'dexie';

const defaultState = {
    modalOpen: false,
    modeler:'',
    camundaVersion: 4
};

export default class TagManagement extends PureComponent {
    constructor(props) {
        super(props);
        this.state = defaultState;

        this.handleOpenModal = this.handleOpenModal.bind(this);
        this.handleClosed = this.handleClosed.bind(this);
        populateDatabase();
    }

    componentDidMount() {
        const {
            config,
            subscribe,
        } = this.props;

        subscribe('bpmn.modeler.created', (event) => {
                  const {
                    modeler,
                  } = event;

                  this.setState({ 
                    modeler: modeler,
                    camundaVersion: document.querySelector('[title="Toggle version info"]').innerText.substring(0, 1)
                   });
                });
    }

    handleOpenModal() {
        this.setState({modalOpen: true});
    }

    handleClosed() {
        this.setState({...this.state, modalOpen: false});
    }

    render() {     
            return <Fragment><Fill slot="toolbar" group="9_tags">
                <button onClick={this.handleOpenModal}>Tags</button>
                {this.state.modalOpen && <ConfigModal onClose={this.handleClosed} modeler={this.state.modeler} /> }
            </Fill>

            <Fill slot="tab-actions" group="9_tags">
                <button onClick={this.handleOpenModal}>Tags</button>
                {this.state.modalOpen && <ConfigModal onClose={this.handleClosed} modeler={this.state.modeler} /> }
            </Fill>
            
        </Fragment>

    }
}
function populateDatabase(){
    const db = new Dexie('TagDatabase');
    db.version(2).stores({
        tags: '++id, &name, *elements, type',
        bpmn: '++id, bpmn, name, parent',
        vocabulary: '++id, &idTag, *inputs'
    }).upgrade(tx => {
        console.log('Upgrade Dexie TagManagement exists');
        tx.table('bpmn').clear();

        tx.table('bpmn').bulkAdd(bpmnList());

        tx.table('tags').toCollection().toArray().then(array => {

            if(array.filter(tag => tag.name === 'RecipientData').length == 0){
                tx.table('tags').add({name: "RecipientData", type: "Text", elements: ["bpmn:task", "bpmn:sendTask", "bpmn:receiveTask", "bpmn:userTask",
                                                                "bpmn:manualTask", "bpmn:businessRuleTask", "bpmn:serviceTask", 
                                                                "bpmn:scriptTask", "bpmn:callActivity", "bpmn:subProcess"]}).then(key => {
                    tx.table('vocabulary').add({idTag: key, inputs: []});
                });
            
            }

            if(array.filter(tag => tag.name === 'RiskLevel').length == 0){
                tx.table('tags').add({name: "RiskLevel", type: "Text", elements: ["bpmn:task", "bpmn:sendTask", "bpmn:receiveTask", "bpmn:userTask",
                                                            "bpmn:manualTask", "bpmn:businessRuleTask", "bpmn:serviceTask", 
                                                            "bpmn:scriptTask", "bpmn:callActivity", "bpmn:subProcess"]}).then(key => {
                    tx.table('vocabulary').add({idTag: key, inputs: ['Molto alto', 'Alto', 'Medio', 'Basso']});
                });
            }
            

            if(array.filter(tag => tag.name === 'Duration').length == 0){
                tx.table('tags').add({name: "Duration", type: "Numeric", elements: ["bpmn:participant"]});
            }

        });

        return tx.table('tags').toCollection().modify(tag => {
            tag.elements = tag.elements.filter(tagelement => bpmnList().filter(bpmn => bpmn.bpmn === tagelement).length > 0);
            switch(tag.name){
                case "Duration":
                            tag.type = "Numeric";
                            tag.elements = ["bpmn:participant"];
                            break;
                case "IsPersonalDataProcessing":
                            tag.type = "Boolean";
                            tag.elements = ["bpmn:participant"];
                            break;
                case "LegalBasis":
                            tag.type = "Text";
                            tag.elements = ["bpmn:participant"];
                            tx.table('vocabulary').add({idTag: tag.id, inputs: []});
                            break;
                case "RecipientData":
                            tag.type = "Text";
                            tag.elements = ["bpmn:task", "bpmn:sendTask", "bpmn:receiveTask", "bpmn:userTask",
                                                            "bpmn:manualTask", "bpmn:businessRuleTask", "bpmn:serviceTask", 
                                                            "bpmn:scriptTask", "bpmn:callActivity", "bpmn:subProcess"];
                            tx.table('vocabulary').add({idTag: tag.id, inputs: []});
                            break;
                case 'RiskLevel':
                            tag.type = "Text";
                            tag.elements = ["bpmn:task", "bpmn:sendTask", "bpmn:receiveTask", "bpmn:userTask",
                                                            "bpmn:manualTask", "bpmn:businessRuleTask", "bpmn:serviceTask", 
                                                            "bpmn:scriptTask", "bpmn:callActivity", "bpmn:subProcess"];
                            tx.table('vocabulary').add({idTag: tag.id, inputs: ['Molto alto', 'Alto', 'Medio', 'Basso']});
                            break;
                case "TypeOfPersonalData":
                            tag.type = "Vocabulary";
                            tag.elements = ["bpmn:task", "bpmn:sendTask", "bpmn:receiveTask", "bpmn:userTask",
                                                            "bpmn:manualTask", "bpmn:businessRuleTask", "bpmn:serviceTask", 
                                                            "bpmn:scriptTask", "bpmn:callActivity", "bpmn:subProcess"];
                            tx.table('vocabulary').add({idTag: tag.id, inputs: ['Dati sensibili', 'Dati genetici', 'Dati biometrici', 'Dati relativi alla salute']});
                            break;
                case 'PersonalData':
                            tag.type = "Boolean";
                            tag.elements = ["bpmn:task", "bpmn:sendTask", "bpmn:receiveTask", "bpmn:userTask",
                                                            "bpmn:manualTask", "bpmn:businessRuleTask", "bpmn:serviceTask", 
                                                            "bpmn:scriptTask", "bpmn:callActivity", "bpmn:subProcess"];
                            break;
                default: 
                            tag.type = "Boolean";
            }
        })
    });
    db.open();

    db.on('populate', tx => {
        console.log("Populate Dexie TagManagement called");
        tx.table('bpmn').bulkAdd(bpmnList());
        tx.table('tags').bulkAdd(tagList());
        tx.table('vocabulary').bulkAdd(vocabularyList());
    });
}

function bpmnList(){
        const start_bpmn_list = [];
        start_bpmn_list.push(
                    {bpmn: "bpmn:participant", name: "Pool/Participant"},
                    {bpmn: "bpmn:task", name: "Task", parent: "Tasks"},
                    {bpmn: "bpmn:sendTask", name: "Send Task", parent: "Tasks"},
                    {bpmn: "bpmn:receiveTask", name: "Receive Task", parent: "Tasks"},
                    {bpmn: "bpmn:userTask", name: "User Task", parent: "Tasks"},
                    {bpmn: "bpmn:manualTask", name: "Manual Task", parent: "Tasks"},
                    {bpmn: "bpmn:businessRuleTask", name: "Business Rule Task", parent: "Tasks"},
                    {bpmn: "bpmn:serviceTask", name: "Service Task", parent: "Tasks"},
                    {bpmn: "bpmn:scriptTask", name: "Script Task", parent: "Tasks"},
                    {bpmn: "bpmn:callActivity", name: "Call Activity", parent: "Tasks"},
                    {bpmn: "bpmn:subProcess", name: "Sub Process", parent: "Tasks"});
        return start_bpmn_list;
    }
function tagList(){
    const start_tag_list = [];
    start_tag_list.push({id: 1, name: 'IsPersonalDataProcessing', type: "Boolean", elements: ["bpmn:participant"]},
                        {id: 2, name: "LegalBasis", type: "Text", elements: ["bpmn:participant"]},
                        {id: 3, name: "Duration", type: "Numeric", elements: ["bpmn:participant"]},
                        {id: 4, name: "PersonalData", type: "Boolean", elements: ["bpmn:task", "bpmn:sendTask", "bpmn:receiveTask", "bpmn:userTask",
                                                            "bpmn:manualTask", "bpmn:businessRuleTask", "bpmn:serviceTask", 
                                                            "bpmn:scriptTask", "bpmn:callActivity", "bpmn:subProcess"]},
                        {id: 5, name: "TypeOfPersonalData", type: "Vocabulary", elements: ["bpmn:task", "bpmn:sendTask", "bpmn:receiveTask", "bpmn:userTask",
                                                            "bpmn:manualTask", "bpmn:businessRuleTask", "bpmn:serviceTask", 
                                                            "bpmn:scriptTask", "bpmn:callActivity", "bpmn:subProcess"]},
                        {id: 6, name: "RiskLevel", type: "Text", elements: ["bpmn:task", "bpmn:sendTask", "bpmn:receiveTask", "bpmn:userTask",
                                                            "bpmn:manualTask", "bpmn:businessRuleTask", "bpmn:serviceTask", 
                                                            "bpmn:scriptTask", "bpmn:callActivity", "bpmn:subProcess"]},
                        {id: 7, name: "RecipientData", type: "Text", elements: ["bpmn:task", "bpmn:sendTask", "bpmn:receiveTask", "bpmn:userTask",
                                                            "bpmn:manualTask", "bpmn:businessRuleTask", "bpmn:serviceTask", 
                                                            "bpmn:scriptTask", "bpmn:callActivity", "bpmn:subProcess"]});
    return start_tag_list;
}

function vocabularyList(){
    const start_vocabulary_list = [];
    start_vocabulary_list.push({idTag: 2, inputs: []},
                                {idTag: 5, inputs: ['Dati sensibili', 'Dati genetici', 'Dati biometrici', 'Dati relativi alla salute']},
                                {idTag: 6, inputs: ['Molto alto', 'Alto', 'Medio', 'Basso']},
                                {idTag: 7, inputs: []});
    return start_vocabulary_list;
}

