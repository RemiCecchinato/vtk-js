import macro from 'vtk.js/Sources/macro';
import vtkAbstractWidgetFactory from 'vtk.js/Sources/Widgets/Core/AbstractWidgetFactory';
import vtkPlanePointManipulator from 'vtk.js/Sources/Widgets/Manipulators/PlaneManipulator';
import vtkSphereHandleRepresentation from 'vtk.js/Sources/Widgets/Representations/SphereHandleRepresentation';
import vtkCircleContextRepresentation from 'vtk.js/Sources/Widgets/Representations/CircleContextRepresentation';
import widgetBehavior from 'vtk.js/Sources/Widgets/Widgets3D/EllipseWidget/behavior';
import stateGenerator from 'vtk.js/Sources/Widgets/Widgets3D/EllipseWidget/state';

import SHAPE_DEFAULT_VALUES from 'vtk.js/Sources/Widgets/Widgets3D/ShapeWidget';

import {
  BehaviorCategory,
  ShapeBehavior,
} from 'vtk.js/Sources/Widgets/Widgets3D/ShapeWidget/Constants';

import { ViewTypes } from 'vtk.js/Sources/Widgets/Core/WidgetManager/Constants';

// ----------------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------------

function vtlEllipseWidget(publicAPI, model) {
  model.classHierarchy.push('vtkEllipseWidget');

  // --- Widget Requirement ---------------------------------------------------

  model.behavior = widgetBehavior;
  publicAPI.getRepresentationsForViewType = (viewType) => {
    switch (viewType) {
      case ViewTypes.DEFAULT:
      case ViewTypes.GEOMETRY:
      case ViewTypes.SLICE:
      case ViewTypes.VOLUME:
      default:
        return [
          { builder: vtkSphereHandleRepresentation, labels: ['moveHandle'] },
          {
            builder: vtkCircleContextRepresentation,
            labels: ['ellipseHandle'],
          },
        ];
    }
  };

  // --------------------------------------------------------------------------
  // initialization
  // --------------------------------------------------------------------------

  // Default manipulator
  model.manipulator = vtkPlanePointManipulator.newInstance();
  model.widgetState = stateGenerator();
  model.shapeHandle = model.widgetState.getEllipseHandle();
  model.moveHandle = model.widgetState.getMoveHandle();
  model.moveHandle.setManipulator(model.manipulator);
}

// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  modifierBehavior: {
    None: {
      [BehaviorCategory.PLACEMENT]:
        ShapeBehavior[BehaviorCategory.PLACEMENT].CLICK_AND_DRAG,
      [BehaviorCategory.POINTS]:
        ShapeBehavior[BehaviorCategory.POINTS].CENTER_TO_CORNER,
      [BehaviorCategory.RATIO]: ShapeBehavior[BehaviorCategory.RATIO].FREE,
    },
    Shift: {
      [BehaviorCategory.RATIO]: ShapeBehavior[BehaviorCategory.RATIO].FIXED,
    },
    Control: {
      [BehaviorCategory.POINTS]:
        ShapeBehavior[BehaviorCategory.POINTS].CORNER_TO_CORNER,
    },
  },
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(
    model,
    Object.assign({}, SHAPE_DEFAULT_VALUES.DEFAULT_VALUES, DEFAULT_VALUES),
    initialValues
  );

  vtkAbstractWidgetFactory.extend(publicAPI, model, initialValues);
  macro.setGet(publicAPI, model, ['manipulator', 'widgetState']);

  vtlEllipseWidget(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkEllipseWidget');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
