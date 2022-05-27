
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import Text from 'diagram-js/lib/util/Text';

import {
  isObject,
  some,
  every
} from 'min-dash';

import {
append as svgAppend,
attr as svgAttr,
create as svgCreate,
remove as svgRemove,
classes as svgClasses,
transform as svgTransform,
} from 'tiny-svg';

import {
  rotate,
  transform,
  translate
} from 'diagram-js/lib/util/SvgTransformUtil';
//import svgClasses from 'tiny-svg';

import {
getRoundRectPath
} from 'bpmn-js/lib/draw/BpmnRenderUtil';

import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';

const HIGH_PRIORITY = 1500;
const TASK_BORDER_RADIUS = 10;
const INNER_OUTER_DIST = 3;
const DEFAULT_FILL_OPACITY = .95;
const HIGH_FILL_OPACITY = .35;

const LABEL_STYLE = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 8
  };

const LABEL_STYLE2 = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 12
  };

let handlers, 
  pathMap2, 
  defaultFillColor, 
  defaultStrokeColor, 
  defaultLabelColor,
  computeStyle, 
  bpmnRenderer2, 
  textRenderer2,
  camundaVersion;


export default class CustomRenderer extends BaseRenderer {
constructor(config, eventBus, styles, pathMap, bpmnRenderer, textRenderer) {
  super(eventBus, HIGH_PRIORITY);

  camundaVersion = document.querySelector('[title="Toggle version info"]').innerText.substring(0, 1);

  bpmnRenderer2 = bpmnRenderer;
  computeStyle = styles.computeStyle;
  pathMap2 = pathMap;
  defaultFillColor = config && config.defaultFillColor;
  defaultStrokeColor = config && config.defaultStrokeColor;
  defaultLabelColor = config && config.defaultLabelColor;
  textRenderer2 = textRenderer;

  

  handlers = this.handlers = {
    'bpmn:Task': function(parent, element, flag = false, is_subProcess = false, attrs) {
      const is_attached = is_subProcess ? true : checkAttachTaskMarkers(parent, element);
      const markers_height = is_attached ? 20 : 0;
      let text = '';
      let nelements = 0;
      let longest = '';
      if(getSemantic(element).extensionElements && getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').length > 0){
        nelements = getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').length;
        let bigger = 0;
        const temp_text = getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').map(e => {
          if(e.name.length + e.value.length > bigger){
            longest = '{GDPR:' + e.name + ' = ' + e.value + '}';
            bigger = e.name.length + e.value.length;
          } 
          return ('{GDPR:' + e.name + ' = ' + e.value + '}');
        }).join('\n');
        text = temp_text;
      } else {
        text = '';
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = '8px Arial';
      const newheight = text !== '' ? 8*1.2*nelements + 10 : 0;
      const newwidth = context.measureText(longest).width === 0 ? 0 : context.measureText(longest).width + 10;


      const embedded_width = text !== '' ? newwidth : element.width;
      const embedded_height = text !== '' ? 30 : 80;
      const top_width = newwidth > 100 ? newwidth : 100;
      //const top_height = newheight > element.height ? newheight + 30 : element.height + markers_height;
      const top_height = (embedded_height + newheight + markers_height) > 80 ? embedded_height + newheight + markers_height : 80;
      element.height = top_height;
      const top_rect = drawRect(parent, top_width, top_height, TASK_BORDER_RADIUS, attrs ? attrs.strokeWidth : 2);
      renderEmbeddedLabel(parent, element, 'center-middle', embedded_width, embedded_height, text !== '' ? flag : false);

      const bottom_width = newwidth > 100 ? newwidth : 100;
      if(text !== ''){
          const rect = drawRect(parent, bottom_width, newheight, TASK_BORDER_RADIUS, 0, 'none');
        svgAttr(rect, {
            transform: 'translate(0, 30)'
          });
        renderCustomLabel(parent, text, element, bottom_width, newheight);
      }

      bottom_width > 100 ? element.width = bottom_width : element.width = 100;

      is_subProcess ? attachTaskMarkers(parent, element, ['SubProcessMarker']) : attachTaskMarkers(parent, element);

      //newheight > element.height ? element.height = newheight + markers_height : element.height += markers_height;

      return top_rect;
    }, 'bpmn:UserTask': function(parent, element) {
      const top_rect = renderer('bpmn:Task')(parent, element, true, false);

      var x = 15;
      var y = 12;

      var pathData = pathMap2.getScaledPath('TASK_TYPE_USER_1', {
        abspos: {
          x: x,
          y: y
        }
      });

      /* user path */ drawPath(parent, pathData, {
        strokeWidth: 0.5,
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      var pathData2 = pathMap2.getScaledPath('TASK_TYPE_USER_2', {
        abspos: {
          x: x,
          y: y
        }
      });

      /* user2 path */ drawPath(parent, pathData2, {
        strokeWidth: 0.5,
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      var pathData3 = pathMap2.getScaledPath('TASK_TYPE_USER_3', {
        abspos: {
          x: x,
          y: y
        }
      });

      /* user3 path */ drawPath(parent, pathData3, {
        strokeWidth: 0.5,
        fill: getStrokeColor(element, defaultStrokeColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      return top_rect;
    }, 'bpmn:ServiceTask': function(parent, element) {
      const top_rect = renderer('bpmn:Task')(parent, element, true, false);

      var pathDataBG = pathMap.getScaledPath('TASK_TYPE_SERVICE', {
        abspos: {
          x: 12,
          y: 18
        }
      });

      /* service bg */ drawPath(parent, pathDataBG, {
        strokeWidth: 1,
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      var fillPathData = pathMap.getScaledPath('TASK_TYPE_SERVICE_FILL', {
        abspos: {
          x: 17.2,
          y: 18
        }
      });

      /* service fill */ drawPath(parent, fillPathData, {
        strokeWidth: 0,
        fill: getFillColor(element, defaultFillColor)
      });

      var pathData = pathMap.getScaledPath('TASK_TYPE_SERVICE', {
        abspos: {
          x: 17,
          y: 22
        }
      });

      /* service */ drawPath(parent, pathData, {
        strokeWidth: 1,
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      return top_rect;
    }, 'bpmn:ManualTask': function(parent, element) {
      const top_rect = renderer('bpmn:Task')(parent, element, true, false);

      var pathData = pathMap.getScaledPath('TASK_TYPE_MANUAL', {
        abspos: {
          x: 17,
          y: 15
        }
      });

      /* manual path */ drawPath(parent, pathData, {
        strokeWidth: 0.5, // 0.25,
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      return top_rect;
    }, 'bpmn:SendTask': function(parent, element) {
      const top_rect = renderer('bpmn:Task')(parent, element, true, false);

      var pathData = pathMap.getScaledPath('TASK_TYPE_SEND', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: 21,
        containerHeight: 14,
        position: {
          mx: 0.285,
          my: 0.357
        }
      });

      /* send path */ drawPath(parent, pathData, {
        strokeWidth: 1,
        fill: getStrokeColor(element, defaultStrokeColor),
        stroke: getFillColor(element, defaultFillColor)
      });

      return top_rect;
    }, 'bpmn:ReceiveTask': function(parent, element) {
      const top_rect = renderer('bpmn:Task')(parent, element, true, false);

      var semantic = getSemantic(element);

      var pathData;
      if (semantic.instantiate) {
        bpmnRenderer2.drawCircle(parent, 28, 28, 20 * 0.22, { strokeWidth: 1 });

        pathData = pathMap.getScaledPath('TASK_TYPE_INSTANTIATING_SEND', {
          abspos: {
            x: 7.77,
            y: 9.52
          }
        });
      } else {

        pathData = pathMap.getScaledPath('TASK_TYPE_SEND', {
          xScaleFactor: 0.9,
          yScaleFactor: 0.9,
          containerWidth: 21,
          containerHeight: 14,
          position: {
            mx: 0.3,
            my: 0.4
          }
        });
      }

      /* receive path */ drawPath(parent, pathData, {
        strokeWidth: 1,
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      return top_rect;
    }, 'bpmn:ScriptTask': function(parent, element) {
      const top_rect = renderer('bpmn:Task')(parent, element, true, false);

      var pathData = pathMap.getScaledPath('TASK_TYPE_SCRIPT', {
        abspos: {
          x: 15,
          y: 20
        }
      });

      /* script path */ drawPath(parent, pathData, {
        strokeWidth: 1,
        stroke: getStrokeColor(element, defaultStrokeColor)
      });


      return top_rect;
    }, 'bpmn:BusinessRuleTask': function(parent, element) {
      const top_rect = renderer('bpmn:Task')(parent, element, true, false);

      var headerPathData = pathMap.getScaledPath('TASK_TYPE_BUSINESS_RULE_HEADER', {
        abspos: {
          x: 8,
          y: 8
        }
      });

      var businessHeaderPath = drawPath(parent, headerPathData);
      svgAttr(businessHeaderPath, {
        strokeWidth: 1,
        fill: getFillColor(element, '#aaaaaa'),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      var headerData = pathMap.getScaledPath('TASK_TYPE_BUSINESS_RULE_MAIN', {
        abspos: {
          x: 8,
          y: 8
        }
      });

      var businessPath = drawPath(parent, headerData);
      svgAttr(businessPath, {
        strokeWidth: 1,
        stroke: getStrokeColor(element, defaultStrokeColor)
      });


      return top_rect;
    }, 'bpmn:SubProcess': function(parent, element, attrs) {
      const attrsNew = attrs || {
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      };

      let top_rect;
      const expanded = isExpanded(element);
      if (isEventSubProcess(element)) {
        svgAttr(top_rect, {
          strokeDasharray: '1,2'
        });
      }

      //renderEmbeddedLabel(parentGfx, element, expanded ? 'center-top' : 'center-middle');

      if (expanded) {
        top_rect = bpmnRenderer2.handlers['bpmn:Activity'](parent, element, attrsNew);
        renderEmbeddedLabelOriginal(parent, element, 'center-top');
        attachTaskMarkers(parent, element);
      } else {
        top_rect = renderer('bpmn:Task')(parent, element, false, true, attrsNew);
      }

      return top_rect;
    }, 'bpmn:AdHocSubProcess': function(parent, element) {
      return renderer('bpmn:SubProcess')(parent, element);
    }, 'bpmn:Transaction': function(parent, element) {
      return bpmnRenderer2.handlers['bpmn:Transaction'](parent, element);
    }, 'bpmn:CallActivity': function(parent, element) {
      return renderer('bpmn:SubProcess')(parent, element, {
        strokeWidth: 5
      });
    },'bpmn:Participant': function(parent, element) {

      var attrs = {
        fillOpacity: DEFAULT_FILL_OPACITY,
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      };

  

      var expandedPool = isExpanded(element);


      let text = '';
      let nelements = 0;
      let longest = '';
      if(getSemantic(element).extensionElements && getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').length > 0){
        nelements = getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').length;
        let bigger = 0;
        const temp_text = getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').map(e => {
          if(e.name.length + e.value.length > bigger){
            longest = '{GDPR:' + e.name + ' = ' + e.value + '}';
            bigger = e.name.length + e.value.length;
          } 
          return ('{GDPR:' + e.name + ' = ' + e.value + '}');
        }).join('\n');
        text = temp_text;
      } else {
        text = '';
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = '8px Arial';
      const newheight = text !== '' ? 8*1.2*nelements + 20 : 0;
      const newwidth = context.measureText(longest).width === 0 ? 0 : context.measureText(longest).width + 10;

      const participant_height = 30 + newheight;

      const lane = renderer('bpmn:Lane')(parent, element, attrs);

      if (expandedPool) {
 
        // svgAttr(lane, {
        //     transform: 'translate(' + newheight + ', 0)'
        //   });
        drawLine(parent, [
          { x: participant_height, y: 0 },
          { x: participant_height, y: element.height }
        ], {
          stroke: getStrokeColor(element, defaultStrokeColor)
        });
        const text_name = getSemantic(element).name;
        const rect = drawRect(parent, participant_height, element.height, TASK_BORDER_RADIUS, 0, 'none');
        renderLaneLabel(parent, text_name, element, 30);
        renderLaneLabel(parent, text, element, newheight);
      } else {
        // Collapsed pool draw text inline
        var text2 = getSemantic(element).name;
        renderLabel(parent, text2, {
          box: element, align: 'center-middle',
          style: {
            fill: getLabelColor(element, defaultLabelColor, defaultStrokeColor)
          }
        });
      }

      var participantMultiplicity = !!(getSemantic(element).participantMultiplicity);

      if (participantMultiplicity) {
        bpmnRenderer2.handlers['ParticipantMultiplicityMarker'](parent, element);
      }

      return lane;
     }, 'bpmn:Lane': function(parentGfx, element, attrs) {
      var rect = drawRect(parentGfx, element.width, element.height, 0, attrs || {
        fill: getFillColor(element, defaultFillColor),
        fillOpacity: HIGH_FILL_OPACITY,
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      var semantic = getSemantic(element);

      if (semantic.$type === 'bpmn:Lane') {
        var text = semantic.name;
        renderLaneLabel(parentGfx, text, element);
      }

      return rect;
    }, 'bpmn:Gateway': function(parentGfx, element) {
      var attrs = {
        fill: getFillColor(element, defaultFillColor),
        fillOpacity: DEFAULT_FILL_OPACITY,
        stroke: getStrokeColor(element, defaultStrokeColor)
      };
      const diamond = drawDiamond(parentGfx, 50, 50, attrs);

      let text = '';
      let nelements = 0;
      let longest = '';
      if(getSemantic(element).extensionElements && getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').length > 0){
        nelements = getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').length;
        let bigger = 0;
        const temp_text = getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').map(e => {
          if(e.name.length + e.value.length > bigger){
            longest = '{GDPR:' + e.name + ' = ' + e.value + '}';
            bigger = e.name.length + e.value.length;
          } 
          return ('{GDPR:' + e.name + ' = ' + e.value + '}');
        }).join('\n');
        text = temp_text;
      } else {
        text = '';
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = '8px Arial';
      const newheight = text !== '' ? 8*1.2*nelements + 10 : 0;
      const newwidth = context.measureText(longest).width === 0 ? 0 : context.measureText(longest).width + 10;
      const rect_width = newwidth > 50 ? newwidth : 50;


      if(text !== ''){
        const rect = drawRect(parentGfx, rect_width, newheight, 2, 1);
        // svgAttr(rect, {
        //     transform: 'translate(0, 30)'
        //   });
        translate(rect, 0, 55);
        const custLabel = renderCustomLabel(parentGfx, text, element, rect_width, newheight);
        translate(custLabel, 5, 60);
      }

      text !== '' ? element.height = 50 + 5 + newheight : element.height = 50;
      element.width = rect_width;
      translate(diamond, element.width/2-25, 0);
      return diamond;
    }, 'bpmn:InclusiveGateway': function(parentGfx, element) {
      const diamond = renderer('bpmn:Gateway')(parentGfx, element);

      /* circle path */
      const circle = drawCircle(parentGfx, 50, 50, 50 * 0.24, {
        strokeWidth: 2.5,
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });
      translate(circle, element.width/2-25, 0);

      return diamond;
    }, 'bpmn:ExclusiveGateway': function(parentGfx, element) {
      var diamond = renderer('bpmn:Gateway')(parentGfx, element);

      var pathData = pathMap.getScaledPath('GATEWAY_EXCLUSIVE', {
        xScaleFactor: 0.4,
        yScaleFactor: 0.4,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.32,
          my: 0.3
        }
      });

      if ((element.di.isMarkerVisible)) {
        const cross = drawPath(parentGfx, pathData, {
          strokeWidth: 1,
          fill: getStrokeColor(element, defaultStrokeColor),
          stroke: getStrokeColor(element, defaultStrokeColor)
        });
        translate(cross, element.width/2-25, 0);
      }

      return diamond;
    }, 'bpmn:ComplexGateway': function(parentGfx, element) {
      var diamond = renderer('bpmn:Gateway')(parentGfx, element);

      var pathData = pathMap.getScaledPath('GATEWAY_COMPLEX', {
        xScaleFactor: 0.5,
        yScaleFactor:0.5,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.46,
          my: 0.26
        }
      });

      const complex = drawPath(parentGfx, pathData, {
        strokeWidth: 1,
        fill: getStrokeColor(element, defaultStrokeColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      translate(complex, element.width/2-25, 0);

      return diamond;
    }, 'bpmn:ParallelGateway': function(parentGfx, element) {
      var diamond = renderer('bpmn:Gateway')(parentGfx, element);

      var pathData = pathMap.getScaledPath('GATEWAY_PARALLEL', {
        xScaleFactor: 0.6,
        yScaleFactor:0.6,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.46,
          my: 0.2
        }
      });

      const parallel = drawPath(parentGfx, pathData, {
        strokeWidth: 1,
        fill: getStrokeColor(element, defaultStrokeColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      translate(parallel, element.width/2-25, 0);

      return diamond;
    }, 'bpmn:EventBasedGateway': function(parentGfx, element) {

      var semantic = getSemantic(element);

      var diamond = renderer('bpmn:Gateway')(parentGfx, element);

      const circle = drawCircle(parentGfx, 50, 50, 50 * 0.20, {
        strokeWidth: 1,
        fill: 'none',
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      translate(circle, element.width/2-25, 0);

      var type = semantic.eventGatewayType;
      var instantiate = !!semantic.instantiate;

      function drawEvent() {

        var pathData = pathMap.getScaledPath('GATEWAY_EVENT_BASED', {
          xScaleFactor: 0.18,
          yScaleFactor: 0.18,
          containerWidth: 50,
          containerHeight: 50,
          position: {
            mx: 0.36,
            my: 0.44
          }
        });

        var attrs = {
          strokeWidth: 2,
          fill: getFillColor(element, 'none'),
          stroke: getStrokeColor(element, defaultStrokeColor)
        };

        const inside = drawPath(parentGfx, pathData, attrs);
        translate(inside, element.width/2-25, 0);
      }

      if (type === 'Parallel') {

        var pathData = pathMap.getScaledPath('GATEWAY_PARALLEL', {
          xScaleFactor: 0.4,
          yScaleFactor:0.4,
          containerWidth: 50,
          containerHeight: 50,
          position: {
            mx: 0.474,
            my: 0.296
          }
        });

        const parallelPath = drawPath(parentGfx, pathData);
        svgAttr(parallelPath, {
          strokeWidth: 1,
          fill: 'none'
        });
        translate(parallelPath, element.width/2-25, 0);
      } else if (type === 'Exclusive') {

        if (!instantiate) {
          const innerCircle = drawCircle(parentGfx, 50, 50, 50 * 0.26);
          svgAttr(innerCircle, {
            strokeWidth: 1,
            fill: 'none',
            stroke: getStrokeColor(element, defaultStrokeColor)
          });
          translate(innerCircle, element.width/2-25, 0);
        }

        drawEvent();
      }


      return diamond;
    }, 'bpmn:Event': function(parentGfx, element, attrs) {

      if (!('fillOpacity' in attrs)) {
        attrs.fillOpacity = DEFAULT_FILL_OPACITY;
      }

      const circle = drawCircle(parentGfx, 50, 50, attrs);

      let text = '';
      let nelements = 0;
      let longest = '';
      if(getSemantic(element).extensionElements && getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').length > 0){
        nelements = getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').length;
        let bigger = 0;
        const temp_text = getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').map(e => {
          if(e.name.length + e.value.length > bigger){
            longest = '{GDPR:' + e.name + ' = ' + e.value + '}';
            bigger = e.name.length + e.value.length;
          } 
          return ('{GDPR:' + e.name + ' = ' + e.value + '}');
        }).join('\n');
        text = temp_text;
      } else {
        text = '';
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = '8px Arial';
      const newheight = text !== '' ? 8*1.2*nelements + 10 : 0;
      const newwidth = context.measureText(longest).width === 0 ? 0 : context.measureText(longest).width + 10;
      const rect_width = newwidth > 50 ? newwidth : 50;


      if(text !== ''){
        const rect = drawRect(parentGfx, rect_width, newheight, 2, 1);
        // svgAttr(rect, {
        //     transform: 'translate(0, 30)'
        //   });
        translate(rect, 0, 55);
        const custLabel = renderCustomLabel(parentGfx, text, element, rect_width, newheight);
        translate(custLabel, 5, 60);
      }

      text !== '' ? element.height = 50 + 5 + newheight : element.height = 50;
      element.width = rect_width;
      translate(circle, element.width/2-25, 0);
      return circle;
    }, 'bpmn:StartEvent': function(parent, element) {
      var attrs = {
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      };

      var semantic = getSemantic(element);

      if (!semantic.isInterrupting) {
        attrs = {
          strokeDasharray: '6',
          strokeLinecap: 'round',
          fill: getFillColor(element, defaultFillColor),
          stroke: getStrokeColor(element, defaultStrokeColor)
        };
      }
      var circle = renderer('bpmn:Event')(parent, element, attrs);

      renderEventContent(element, parent);

      return circle;
    }, 'bpmn:MessageEventDefinition': function(parentGfx, element, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_MESSAGE', {
        xScaleFactor: 0.9,
        yScaleFactor: 0.9,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.235,
          my: 0.315
        }
      });

      var fill = isThrowing ? getStrokeColor(element, defaultStrokeColor) : getFillColor(element, defaultFillColor);
      var stroke = isThrowing ? getFillColor(element, defaultFillColor) : getStrokeColor(element, defaultStrokeColor);

      var messagePath = drawPath(parentGfx, pathData, {
        strokeWidth: 1,
        fill: fill,
        stroke: stroke
      });

      translate(messagePath, element.width/2-25, 0);

      return messagePath;
    }, 'bpmn:TimerEventDefinition': function(parentGfx, element) {
      var circle = drawCircle(parentGfx, 50, 50, 0.2 * 50, {
        strokeWidth: 2,
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      var pathData = pathMap.getScaledPath('EVENT_TIMER_WH', {
        xScaleFactor: 0.75,
        yScaleFactor: 0.75,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.5,
          my: 0.5
        }
      });

      const event_timer = drawPath(parentGfx, pathData, {
        strokeWidth: 2,
        strokeLinecap: 'square',
        stroke: getStrokeColor(element, defaultStrokeColor)
      });
      translate(event_timer, element.width/2-25, 0);

      for (var i = 0;i < 12; i++) {

        var linePathData = pathMap.getScaledPath('EVENT_TIMER_LINE', {
          xScaleFactor: 0.75,
          yScaleFactor: 0.75,
          containerWidth: 50,
          containerHeight: 50,
          position: {
            mx: 0.5,
            my: 0.5
          }
        });

        var width = element.width / 2;
        var height = element.height / 2;

        const timer = drawPath(parentGfx, linePathData, {
          strokeWidth: 1,
          strokeLinecap: 'square',
          transform: 'rotate(' + (i * 30) + ',' + height + ',' + width + ')',
          stroke: getStrokeColor(element, defaultStrokeColor)
        });
        translate(timer, element.width/2-25, 0);
      }
      translate(circle, element.width/2-25, 0);

      return circle;
    }, 'bpmn:EscalationEventDefinition': function(parentGfx, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_ESCALATION', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.5,
          my: 0.2
        }
      });

      var fill = isThrowing ? getStrokeColor(event, defaultStrokeColor) : 'none';

      const escalation = drawPath(parentGfx, pathData, {
        strokeWidth: 1,
        fill: fill,
        stroke: getStrokeColor(event, defaultStrokeColor)
      });
      translate(escalation, event.width/2-25, 0);
      return escalation;
    }, 'bpmn:ConditionalEventDefinition': function(parentGfx, event) {
      var pathData = pathMap.getScaledPath('EVENT_CONDITIONAL', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.5,
          my: 0.222
        }
      });

      const conditional = drawPath(parentGfx, pathData, {
        strokeWidth: 1,
        stroke: getStrokeColor(event, defaultStrokeColor)
      });
      translate(conditional, event.width/2-25, 0);
      return conditional;
    }, 'bpmn:LinkEventDefinition': function(parentGfx, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_LINK', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.57,
          my: 0.263
        }
      });

      var fill = isThrowing ? getStrokeColor(event, defaultStrokeColor) : 'none';

      const link = drawPath(parentGfx, pathData, {
        strokeWidth: 1,
        fill: fill,
        stroke: getStrokeColor(event, defaultStrokeColor)
      });
      translate(link, event.width/2-25, 0);
      return link;
    }, 'bpmn:ErrorEventDefinition': function(parentGfx, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_ERROR', {
        xScaleFactor: 1.1,
        yScaleFactor: 1.1,
        containerWidth:50,
        containerHeight: 50,
        position: {
          mx: 0.2,
          my: 0.722
        }
      });

      var fill = isThrowing ? getStrokeColor(event, defaultStrokeColor) : 'none';

      const error = drawPath(parentGfx, pathData, {
        strokeWidth: 1,
        fill: fill,
        stroke: getStrokeColor(event, defaultStrokeColor)
      });
      translate(error, event.width/2-25, 0);
      return error;
    }, 'bpmn:CancelEventDefinition': function(parentGfx, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_CANCEL_45', {
        xScaleFactor: 1.0,
        yScaleFactor: 1.0,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.638,
          my: -0.055
        }
      });

      var fill = isThrowing ? getStrokeColor(event, defaultStrokeColor) : 'none';

      var path = drawPath(parentGfx, pathData, {
        strokeWidth: 1,
        fill: fill,
        stroke: getStrokeColor(event, defaultStrokeColor)
      });

      rotate(path, 45);
      translate(path, event.width/2-25, 0);

      return path;
    }, 'bpmn:CompensateEventDefinition': function(parentGfx, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_COMPENSATION', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.22,
          my: 0.5
        }
      });

      var fill = isThrowing ? getStrokeColor(event, defaultStrokeColor) : 'none';

      const compensation = drawPath(parentGfx, pathData, {
        strokeWidth: 1,
        fill: fill,
        stroke: getStrokeColor(event, defaultStrokeColor)
      });
      translate(compensation, event.width/2-25, 0);
      return compensation;
    }, 'bpmn:SignalEventDefinition': function(parentGfx, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_SIGNAL', {
        xScaleFactor: 0.9,
        yScaleFactor: 0.9,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.5,
          my: 0.2
        }
      });

      var fill = isThrowing ? getStrokeColor(event, defaultStrokeColor) : 'none';

      const signal = drawPath(parentGfx, pathData, {
        strokeWidth: 1,
        fill: fill,
        stroke: getStrokeColor(event, defaultStrokeColor)
      });
      translate(signal, event.width/2-25, 0);
      return signal;
    },
    'bpmn:MultipleEventDefinition': function(parentGfx, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_MULTIPLE', {
        xScaleFactor: 1.1,
        yScaleFactor: 1.1,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.222,
          my: 0.36
        }
      });

      var fill = isThrowing ? getStrokeColor(event, defaultStrokeColor) : 'none';

      const multiple = drawPath(parentGfx, pathData, {
        strokeWidth: 1,
        fill: fill
      });
      translate(multiple, event.width/2-25, 0);
      return multiple;
    },
    'bpmn:ParallelMultipleEventDefinition': function(parentGfx, event) {
      var pathData = pathMap.getScaledPath('EVENT_PARALLEL_MULTIPLE', {
        xScaleFactor: 1.2,
        yScaleFactor: 1.2,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0.458,
          my: 0.194
        }
      });

      const parallel = drawPath(parentGfx, pathData, {
        strokeWidth: 1,
        fill: getStrokeColor(event, defaultStrokeColor),
        stroke: getStrokeColor(event, defaultStrokeColor)
      });
      translate(parallel, event.width/2-25, 0);
      return parallel;
    }, 'bpmn:EndEvent': function(parentGfx, element) {
      var circle = renderer('bpmn:Event')(parentGfx, element, {
        strokeWidth: 4,
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      renderEventContent(element, parentGfx, true);

      return circle;
    },
    'bpmn:TerminateEventDefinition': function(parentGfx, element) {
      var circle = drawCircle(parentGfx, 50, 50, 8, {
        strokeWidth: 4,
        fill: getStrokeColor(element, defaultStrokeColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      translate(circle, element.width/2-25, 0);
      return circle;
    },
    'bpmn:IntermediateEvent': function(parentGfx, element) {
      var outer = renderer('bpmn:Event')(parentGfx, element, {
        strokeWidth: 1,
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      /* inner */
      const inner = drawCircle(parentGfx, 50, 50, INNER_OUTER_DIST, {
        strokeWidth: 1,
        fill: getFillColor(element, 'none'),
        stroke: getStrokeColor(element, defaultStrokeColor)
      });
      translate(inner, element.width/2-25, 0);

      renderEventContent(element, parentGfx);

      return outer;
    },'bpmn:BoundaryEvent': function(parentGfx, element) {

      var semantic = getSemantic(element),
          cancel = semantic.cancelActivity;

      var attrs = {
        strokeWidth: 1,
        fill: getFillColor(element, defaultFillColor),
        stroke: getStrokeColor(element, defaultStrokeColor)
      };

      if (!cancel) {
        attrs.strokeDasharray = '6';
        attrs.strokeLinecap = 'round';
      }

      // apply fillOpacity
      var outerAttrs = assign({}, attrs, {
        fillOpacity: 1
      });

      // apply no-fill
      var innerAttrs = assign({}, attrs, {
        fill: 'none'
      });

      var outer = renderer('bpmn:Event')(parentGfx, element, outerAttrs);

      const inner = drawCircle(parentGfx, 50, 50, INNER_OUTER_DIST, innerAttrs);
      translate(inner, element.width/2-25, 0);

      renderEventContent(element, parentGfx);

      return outer;
    }, 'bpmn:DataObject': function(parentGfx, element) {
      var pathData = pathMap.getScaledPath('DATA_OBJECT_PATH', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: 36,
        containerHeight: 50,
        position: {
          mx: 0.474,
          my: 0.296
        }
      });

      var elementObject = drawPath(parentGfx, pathData, {
        fill: getFillColor(element, defaultFillColor),
        fillOpacity: DEFAULT_FILL_OPACITY,
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      var semantic = getSemantic(element);

      let text = '';
      let nelements = 0;
      let longest = '';
      if(getSemantic(element).extensionElements && getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').length > 0){
        nelements = getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').length;
        let bigger = 0;
        const temp_text = getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').map(e => {
          if(e.name.length + e.value.length > bigger){
            longest = '{GDPR:' + e.name + ' = ' + e.value + '}';
            bigger = e.name.length + e.value.length;
          } 
          return ('{GDPR:' + e.name + ' = ' + e.value + '}');
        }).join('\n');
        text = temp_text;
      } else {
        text = '';
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = '8px Arial';
      const newheight = text !== '' ? 8*1.2*nelements + 10 : 0;
      const newwidth = context.measureText(longest).width === 0 ? 0 : context.measureText(longest).width + 10;
      const rect_width = newwidth > 36 ? newwidth : 36;


      if(text !== ''){
        const rect = drawRect(parentGfx, rect_width, newheight, 2, 1);
        // svgAttr(rect, {
        //     transform: 'translate(0, 30)'
        //   });
        translate(rect, 0, 55);
        const custLabel = renderCustomLabel(parentGfx, text, element, rect_width, newheight);
        translate(custLabel, 5, 60);
      }

      text !== '' ? element.height = 50 + 5 + newheight : element.height = 50;
      element.width = rect_width;
      if (isCollection(semantic)) {
        const collection = renderDataItemCollection(parentGfx, element);
        translate(collection, element.width/2-18, 0);
      }
      translate(elementObject, element.width/2-16, 0);

      return elementObject;
    }, 'bpmn:DataInput': function(parentGfx, element) {

      var arrowPathData = pathMap.getRawPath('DATA_ARROW');

      // page
      var elementObject = renderer('bpmn:DataObject')(parentGfx, element);

      const arrow = drawPath(parentGfx, arrowPathData, { strokeWidth: 1 });
      translate(arrow, element.width/2-16, 0);
      return elementObject;
    },
    'bpmn:DataOutput': function(parentGfx, element) {
      var arrowPathData = pathMap.getRawPath('DATA_ARROW');

      // page
      var elementObject = renderer('bpmn:DataObject')(parentGfx, element);

      const arrow = drawPath(parentGfx, arrowPathData, {
        strokeWidth: 1,
        fill: 'black'
      });
      translate(arrow, element.width/2-16, 0);

      return elementObject;
    }, 'bpmn:DataStoreReference': function(parentGfx, element) {
      var DATA_STORE_PATH = pathMap.getScaledPath('DATA_STORE', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: 50,
        containerHeight: 50,
        position: {
          mx: 0,
          my: 0.133
        }
      });

      var elementStore = drawPath(parentGfx, DATA_STORE_PATH, {
        strokeWidth: 2,
        fill: getFillColor(element, defaultFillColor),
        fillOpacity: DEFAULT_FILL_OPACITY,
        stroke: getStrokeColor(element, defaultStrokeColor)
      });

      let text = '';
      let nelements = 0;
      let longest = '';
      if(getSemantic(element).extensionElements && getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').length > 0){
        nelements = getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').length;
        let bigger = 0;
        const temp_text = getSemantic(element).extensionElements.values.filter(e => e.$type === 'tag:Tag').map(e => {
          if(e.name.length + e.value.length > bigger){
            longest = '{GDPR:' + e.name + ' = ' + e.value + '}';
            bigger = e.name.length + e.value.length;
          } 
          return ('{GDPR:' + e.name + ' = ' + e.value + '}');
        }).join('\n');
        text = temp_text;
      } else {
        text = '';
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = '8px Arial';
      const newheight = text !== '' ? 8*1.2*nelements + 10 : 0;
      const newwidth = context.measureText(longest).width === 0 ? 0 : context.measureText(longest).width + 10;
      const rect_width = newwidth > 50 ? newwidth : 50;


      if(text !== ''){
        const rect = drawRect(parentGfx, rect_width, newheight, 2, 1);
        translate(rect, 0, 55);
        const custLabel = renderCustomLabel(parentGfx, text, element, rect_width, newheight);
        translate(custLabel, 5, 60);
      }

      text !== '' ? element.height = 50 + 5 + newheight : element.height = 50;
      element.width = rect_width;
      translate(elementStore, element.width/2-25, 0);
      return elementStore;
    }, 
    'bpmn:IntermediateCatchEvent': as('bpmn:IntermediateEvent'),
    'bpmn:IntermediateThrowEvent': as('bpmn:IntermediateEvent'),
    'bpmn:DataObjectReference': as('bpmn:DataObject')
  }
}
canRender(element) {

// only render tasks and events (ignore labels)
return isAny(element, [ 'bpmn:Task', 'bpmn:Event', 'bpmn:CallActivity', 
  'bpmn:SubProcess', 'bpmn:AdHocSubProcess', 'bpmn:Transaction', 'bpmn:Participant', 
   'bpmn:Lane', 'bpmn:Gateway', 'bpmn:InclusiveGateway', 'bpmn:ParallelGateway', 
   'bpmn:ExclusiveGateway', 'bpmn:ComplexGateway', 'bpmn:EventBasedGateway', 'bpmn:StartEvent', 
   'bpmn:MessageEventDefinition', 'bpmn:TimerEventDefinition', 'bpmn:EscalationEventDefinition', 
   'bpmn:ConditionalEventDefinition', 'bpmn:LinkEventDefinition', 'bpmn:ErrorEventDefinition', 
   'bpmn:CancelEventDefinition', 'bpmn:CompensateEventDefinition', 'bpmn:ParallelMultipleEventDefinition', 
   'bpmn:MultipleEventDefinition', 'bpmn:SignalEventDefinition', 'bpmn:EndEvent', 
   'bpmn:TerminateEventDefinition', 'bpmn:IntermediateEvent', 'bpmn:IntermediateCatchEvent', 
   'bpmn:IntermediateThrowEvent', 'bpmn:BoundaryEvent', 'bpmn:DataObject', 'bpmn:DataObjectReference', 
   'bpmn:DataStoreReference', 'bpmn:DataOutput', 'bpmn:DataInput']) && !element.labelTarget;
}

drawShape = function (parent, element) {
    const type = element.type;

  const h = this.handlers[type];

  /* jshint -W040 */
  return h(parent, element);
  }
}

CustomRenderer.$inject = [ 'config', 'eventBus', 'styles', 'pathMap' , 'bpmnRenderer', 'textRenderer'];

// helpers //////////
 function renderer(type) {
    return handlers[type];
  }

// copied from https://github.com/bpmn-io/bpmn-js/blob/master/lib/draw/BpmnRenderer.js
function drawRect(parentNode, width, height, borderRadius, strokeWidth, fillColor) {
  const rect = svgCreate('rect');

  svgAttr(rect, {
  width: width,
  height: height,
  rx: borderRadius,
  ry: borderRadius,
  stroke: '#000',
  strokeWidth: strokeWidth,
  fill: fillColor || '#fff'
  });

  svgAppend(parentNode, rect);

  return rect;
}

function drawRectForTask(parentNode, element, attrs) {
const rect = svgCreate('rect');

svgAttr(rect, {
width: element.width,
height: element.height,
rx: TASK_BORDER_RADIUS,
ry: TASK_BORDER_RADIUS,
stroke: attrs.stroke || '#000',
strokeWidth: 2,
fill: attrs.fill
});

svgAppend(parentNode, rect);

return rect;
}


function getSemantic(element) {
    //console.log('element getSemantic', element.di);
    return element.businessObject;
}

function renderLabelOld(p, label, options) {
  const textUtil = new Text({
      style: LABEL_STYLE2,
      size: { width: 100 }
    });
    var text = textUtil.createText(label || '', options);
    svgClasses(text).add('djs-label');
    svgAppend(p, text);

    return text;
}

  
function renderLabel(p, label, options) {
  const textUtil = new Text({
      style: LABEL_STYLE,
      size: { width: 100 }
    });
    var text = textUtil.createText(label || '', options);
    svgClasses(text).add('djs-label');
    svgAppend(p, text);

    return text;
}

function renderCustomLabel(parentGfx, text, element, width, height, flag = false) {
    const textBox = renderLabel(parentGfx, text, {
      box: {
        height: height,
        width: width
      },
      align: 'left-top',
      style: {
        fill: '#000000',
      }
    });

    const newheightpos = element.height + 5;
    !flag && svgAttr(textBox, {
      transform: 'translate(5, 30)'
    });

    flag && svgAttr(textBox, {
      transform: 'translate(5, 5)'
    });

    return textBox;
  }

function renderEmbeddedLabel(parentGfx, element, align, width, height, flag) {
    const semantic = getSemantic(element);

    const textBox = renderLabelOld(parentGfx, semantic.name, {
      box: {
        height: height,
        width: width
      },
      align: flag ? 'left-middle' : align,
      // padding: 5,
      style: {
        fill: '#000000'
      }
    });

    if(flag){
      svgAttr(textBox, {
        transform: 'translate(30, 0)'
      });
    }
  }

function renderEmbeddedLabelOriginal(parentGfx, element, align) {
    var semantic = getSemantic(element);

    return renderLabelOriginal(parentGfx, semantic.name, {
      box: element,
      align: align,
      padding: 5,
      style: {
        fill: getLabelColor(element, defaultLabelColor, defaultStrokeColor)
      }
    });
  }

// copied from https://github.com/bpmn-io/diagram-js/blob/master/lib/core/GraphicsFactory.js
function prependTo(newNode, parentNode, siblingNode) {
parentNode.insertBefore(newNode, siblingNode || parentNode.firstChild);
}

function drawPath(parentGfx, d, attrs) {

    attrs = computeStyle(attrs, [ 'no-fill' ], {
      strokeWidth: 2,
      stroke: 'black'
    });

    const path = svgCreate('path');
    svgAttr(path, { d: d });
    svgAttr(path, attrs);

    svgAppend(parentGfx, path);

    return path;
  }

function getFillColor(element, defaultColor) {
  let di;
  if(camundaVersion == 4){
    di = getSemantic(element).di;
  } else {
    di = element.di;
  }
  //const di = getSemantic(element).di;
  //const di = element.di;
  return di.get('color:background-color') || di.get('bioc:fill') || defaultColor || 'white';
}

function getStrokeColor(element, defaultColor) {
  let di;
  if(camundaVersion == 4){
    di = getSemantic(element).di;
  } else {
    di = element.di;
  }
  //const di = getSemantic(element).di;
  //const di = element.di;
  return di.get('color:border-color') || di.get('bioc:stroke') || defaultColor || 'black';
}

function getLabelColor(element, defaultColor, defaultStrokeColor) {
  let di;
  if(camundaVersion == 4){
    di = getSemantic(element).di;
  } else {
    di = element.di;
  }
  // const di = getSemantic(element).di;
  //const di = element.di;
  const label = di.get('label');

  return label && label.get('color:color') || defaultColor ||
    getStrokeColor(element, defaultStrokeColor);
}

function renderLabelOriginal(parentGfx, label, optionOriginal) {

    const options = optionOriginal || {
      size: {
        width: 100
      }
    };

    var text = textRenderer2.createText(label || '', options);

    svgClasses(text).add('djs-label');

    svgAppend(parentGfx, text);

    return text;
  }

function isExpanded(element) {

  if (is(element, 'bpmn:CallActivity')) {
    return false;
  }

  if (is(element, 'bpmn:SubProcess')) {
    return element.di && !!element.di.isExpanded;
  }

  if (is(element, 'bpmn:Participant')) {
    return !!getBusinessObject(element).processRef;
  }

  return true;
}

function getBusinessObject(element) {
  return (element && element.businessObject) || element;
}

function isEventSubProcess(element) {
  return element && !!getBusinessObject(element).triggeredByEvent;
}

function attachTaskMarkers(parentGfx, element, taskMarkers) {
    var obj = getSemantic(element);

    var subprocess = taskMarkers && taskMarkers.indexOf('SubProcessMarker') !== -1;
    var position;

    if (subprocess) {
      position = {
        seq: -21,
        parallel: -22,
        compensation: -42,
        loop: -18,
        adhoc: 10
      };
    } else {
      position = {
        seq: -3,
        parallel: -6,
        compensation: -27,
        loop: 0,
        adhoc: 10
      };
    }

    taskMarkers !== undefined && taskMarkers.forEach(marker => {
      bpmnRenderer2.handlers[marker](parentGfx, element, position);
    });

    if (obj.isForCompensation) {
      bpmnRenderer2.handlers['CompensationMarker'](parentGfx, element, position);
    }

    if (obj.$type === 'bpmn:AdHocSubProcess') {
      bpmnRenderer2.handlers['AdhocMarker'](parentGfx, element, position);
    }

    var loopCharacteristics = obj.loopCharacteristics,
        isSequential = loopCharacteristics && loopCharacteristics.isSequential;

    if (loopCharacteristics) {

      if (isSequential === undefined) {
        bpmnRenderer2.handlers['LoopMarker'](parentGfx, element, position);
      }

      if (isSequential === false) {
        bpmnRenderer2.handlers['ParallelMarker'](parentGfx, element, position);
      }

      if (isSequential === true) {
        bpmnRenderer2.handlers['SequentialMarker'](parentGfx, element, position);
      }
    }
  }

function checkAttachTaskMarkers(parentGfx, element, taskMarkers) {
  let is_attached = false;
  var obj = getSemantic(element);

  var subprocess = taskMarkers && taskMarkers.indexOf('SubProcessMarker') !== -1;

  if(taskMarkers !== undefined && taskMarkers.length > 0){
    is_attached = true;
  }

  if (obj.isForCompensation) {
    is_attached = true;
  }

  if (obj.$type === 'bpmn:AdHocSubProcess') {
    is_attached = true;
  }

  var loopCharacteristics = obj.loopCharacteristics,
      isSequential = loopCharacteristics && loopCharacteristics.isSequential;

  if (loopCharacteristics) {

    if (isSequential === undefined) {
      is_attached = true;
    }

    if (isSequential === false) {
      is_attached = true;
    }

    if (isSequential === true) {
      is_attached = true;
    }
  }

  return is_attached;
}

function drawLine(parentGfx, waypoints, attrs) {
  attrs = computeStyle(attrs, [ 'no-fill' ], {
    stroke: 'black',
    strokeWidth: 2,
    fill: 'none'
  });

  var line = createLine(waypoints, attrs);

  svgAppend(parentGfx, line);

  return line;
}

function toSVGPoints(points) {
  var result = '';

  for (var i = 0, p; (p = points[i]); i++) {
    result += p.x + ',' + p.y + ' ';
  }

  return result;
}

function createLine(points, attrs) {
  var line = svgCreate('polyline');
  svgAttr(line, { points: toSVGPoints(points) });

  if (attrs) {
    svgAttr(line, attrs);
  }

  return line;
}

function renderLaneLabel(parentGfx, text, element, height) {
    var textBox = renderLabel(parentGfx, text, {
      box: {
        height: height || 30,
        width: element.height
      },
      align: 'center-middle',
      style: {
        fill: getLabelColor(element, defaultLabelColor, defaultStrokeColor)
      }
    });

    var top = -1 * element.height;

    transform(textBox, height === 30 ? 0 : 35, -top, 270);
  }

function drawDiamond(parentGfx, width, height, attrs) {

    var x_2 = width / 2;
    var y_2 = height / 2;

    var points = [{ x: x_2, y: 0 }, { x: width, y: y_2 }, { x: x_2, y: height }, { x: 0, y: y_2 }];

    var pointsString = points.map(function(point) {
      return point.x + ',' + point.y;
    }).join(' ');

    attrs = computeStyle(attrs, {
      stroke: 'black',
      strokeWidth: 2,
      fill: 'white'
    });

    var polygon = svgCreate('polygon');
    svgAttr(polygon, {
      points: pointsString
    });
    svgAttr(polygon, attrs);

    svgAppend(parentGfx, polygon);

    return polygon;
  }

function drawCircle(parentGfx, width, height, offset, attrs) {

  if (isObject(offset)) {
    attrs = offset;
    offset = 0;
  }

  offset = offset || 0;

  attrs = computeStyle(attrs, {
    stroke: 'black',
    strokeWidth: 2,
    fill: 'white'
  });

  if (attrs.fill === 'none') {
    delete attrs.fillOpacity;
  }

  var cx = width / 2,
      cy = height / 2;

  var circle = svgCreate('circle');
  svgAttr(circle, {
    cx: cx,
    cy: cy,
    r: Math.round((width + height) / 4 - offset)
  });
  svgAttr(circle, attrs);

  svgAppend(parentGfx, circle);

  return circle;
}

function renderEventContent(element, parentGfx) {

    var event = getSemantic(element);
    var isThrowing = isThrowEvent(event);

    if (event.eventDefinitions && event.eventDefinitions.length>1) {
      if (event.parallelMultiple) {
        return renderer('bpmn:ParallelMultipleEventDefinition')(parentGfx, element, isThrowing);
      }
      else {
        return renderer('bpmn:MultipleEventDefinition')(parentGfx, element, isThrowing);
      }
    }

    if (isTypedEvent(event, 'bpmn:MessageEventDefinition')) {
      return renderer('bpmn:MessageEventDefinition')(parentGfx, element, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:TimerEventDefinition')) {
      return renderer('bpmn:TimerEventDefinition')(parentGfx, element, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:ConditionalEventDefinition')) {
      return renderer('bpmn:ConditionalEventDefinition')(parentGfx, element);
    }

    if (isTypedEvent(event, 'bpmn:SignalEventDefinition')) {
      return renderer('bpmn:SignalEventDefinition')(parentGfx, element, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:EscalationEventDefinition')) {
      return renderer('bpmn:EscalationEventDefinition')(parentGfx, element, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:LinkEventDefinition')) {
      return renderer('bpmn:LinkEventDefinition')(parentGfx, element, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:ErrorEventDefinition')) {
      return renderer('bpmn:ErrorEventDefinition')(parentGfx, element, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:CancelEventDefinition')) {
      return renderer('bpmn:CancelEventDefinition')(parentGfx, element, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:CompensateEventDefinition')) {
      return renderer('bpmn:CompensateEventDefinition')(parentGfx, element, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:TerminateEventDefinition')) {
      return renderer('bpmn:TerminateEventDefinition')(parentGfx, element, isThrowing);
    }

    return null;
  }

function isThrowEvent(event) {
  return (event.$type === 'bpmn:IntermediateThrowEvent') || (event.$type === 'bpmn:EndEvent');
}

function isTypedEvent(event, eventDefinitionType, filter) {

  function matches(definition, filter) {
    return every(filter, function(val, key) {

      // we want a == conversion here, to be able to catch
      // undefined == false and friends
      /* jshint -W116 */
      return definition[key] == val;
    });
  }

  return some(event.eventDefinitions, function(definition) {
    return definition.$type === eventDefinitionType && matches(event, filter);
  });
}

function as(type) {
  return function(parentGfx, element) {
    return handlers[type](parentGfx, element);
  };
}

function isCollection(element) {
  var dataObject = element.dataObjectRef;

  return element.isCollection || (dataObject && dataObject.isCollection);
}

function renderDataItemCollection(parentGfx, element) {

    var yPosition = (element.height - 18) / element.height;

    var pathData = pathMap2.getScaledPath('DATA_OBJECT_COLLECTION_PATH', {
      xScaleFactor: 1,
      yScaleFactor: 1,
      containerWidth: 36,
      containerHeight: 50,
      position: {
        mx: 0.33,
        my: yPosition
      }
    });

    const collection = drawPath(parentGfx, pathData, {
      strokeWidth: 2
    });

    return collection;

  }
