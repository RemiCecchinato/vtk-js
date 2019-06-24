import macro from 'vtk.js/Sources/macro';
import vtkAbstractWidgetFactory from 'vtk.js/Sources/Widgets/Core/AbstractWidgetFactory';
import vtkPlanePointManipulator from 'vtk.js/Sources/Widgets/Manipulators/PlaneManipulator';
import vtkSphereHandleRepresentation from 'vtk.js/Sources/Widgets/Representations/SphereHandleRepresentation';
import vtkRectangleContextRepresentation from 'vtk.js/Sources/Widgets/Representations/RectangleContextRepresentation';
import widgetBehavior from 'vtk.js/Sources/Widgets/Widgets3D/RectangleWidget/behavior';
import stateGenerator from 'vtk.js/Sources/Widgets/Widgets3D/RectangleWidget/state';

import { ViewTypes } from 'vtk.js/Sources/Widgets/Core/WidgetManager/Constants';

// ----------------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------------

function vtkRectangleWidget(publicAPI, model) {
  model.classHierarchy.push('vtkRectangleWidget');

  // --- Widget Requirement ---------------------------------------------------

  model.methodsToLink = [];
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
            builder: vtkRectangleContextRepresentation,
            labels: ['rectangleHandle'],
          },
        ];
    }
  };

  // --------------------------------------------------------------------------
  // initialization
  // --------------------------------------------------------------------------

  // Default manipulator
  model.widgetState = stateGenerator();
  model.manipulator = vtkPlanePointManipulator.newInstance();
  model.widgetState.getMoveHandle().setManipulator(model.manipulator);
}

// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  manipulator: null,
  xAxis: [0, 0, 0],
  yAxis: [0, 0, 0],
  zAxis: [0, 0, 0],
  userEnforceSquare: false,
  allowSquareOnShift: true,
  visibleOnFocus: true,
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtkAbstractWidgetFactory.extend(publicAPI, model, initialValues);
  macro.setGet(publicAPI, model, ['manipulator', 'widgetState']);

  vtkRectangleWidget(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkRectangleWidget');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
