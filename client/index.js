import {registerClientExtension} from 'camunda-modeler-plugin-helpers';
import SelectPlugin from './selecttag/SelectPlugin';
import TagManagement from './tagmanagement/TagManagement';

registerClientExtension(TagManagement);
registerClientExtension(SelectPlugin);


