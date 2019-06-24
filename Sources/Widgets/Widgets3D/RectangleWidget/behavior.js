import macro from 'vtk.js/Sources/macro';

import { SlicingMode } from 'vtk.js/Sources/Rendering/Core/ImageMapper/Constants';
import { vec3 } from 'gl-matrix';

const EPSILON = 1e-6;

function makeSquareFromPoints(point1, point2, model) {
  const d = [0, 0, 0];
  vec3.subtract(d, point2, point1);

  let sx = vec3.dot(d, model.xAxis);
  let sy = vec3.dot(d, model.yAxis);
  let sz = vec3.dot(d, model.zAxis);

  const absSx = Math.abs(sx);
  const absSy = Math.abs(sy);
  const absSz = Math.abs(sz);

  const slicingMode = model.widgetState
    .getRectangleHandle()
    .getDirection()
    .indexOf(1);

  if (slicingMode === SlicingMode.I) {
    if (absSy > EPSILON && absSz > EPSILON) {
      if (absSy > absSz) {
        sz = (sz / absSz) * absSy;
      } else {
        sy = (sy / absSy) * absSz;
      }
    }
  } else if (slicingMode === SlicingMode.J) {
    if (absSx > EPSILON && absSz > EPSILON) {
      if (absSx > absSz) {
        sz = (sz / absSz) * absSx;
      } else {
        sx = (sx / absSx) * absSz;
      }
    }
  } else if (slicingMode === SlicingMode.K) {
    if (absSx > EPSILON && absSy > EPSILON) {
      if (absSx > absSy) {
        sy = (sy / absSy) * absSx;
      } else {
        sx = (sx / absSx) * absSy;
      }
    }
  }

  return [
    point1[0] + sx * model.xAxis[0] + sy * model.yAxis[0] + sz * model.zAxis[0],
    point1[1] + sx * model.xAxis[1] + sy * model.yAxis[1] + sz * model.zAxis[1],
    point1[2] + sx * model.xAxis[2] + sy * model.yAxis[2] + sz * model.zAxis[2],
  ];
}

function makeBoundsFromPoints(point1, point2) {
  return [point1[0], point2[0], point1[1], point2[1], point1[2], point2[2]];
}

export default function widgetBehavior(publicAPI, model) {
  model.classHierarchy.push('vtkRectangleWidgetProp');

  // --------------------------------------------------------------------------
  // Display 2D
  // --------------------------------------------------------------------------

  publicAPI.setDisplayCallback = (callback) =>
    model.representations[0].setDisplayCallback(callback);

  // --------------------------------------------------------------------------
  // Public methods
  // ---------------------------------------------------------------------------

  publicAPI.setSlicingMode = (slicingMode) => {
    if (slicingMode === SlicingMode.X) {
      model.manipulator.setNormal([1, 0, 0]);
    } else if (slicingMode === SlicingMode.Y) {
      model.manipulator.setNormal([0, 1, 0]);
    } else if (slicingMode === SlicingMode.Z) {
      model.manipulator.setNormal([0, 0, 1]);
    }
    model.point1 = null;
    model.point2 = null;
    model.widgetState.getRectangleHandle().setBounds([0, 0, 0, 0, 0, 0]);
    const direction = [0, 0, 0];
    direction[slicingMode % 3] = 1;
    model.widgetState.getRectangleHandle().setDirection(direction);
  };

  publicAPI.setEnforceSquare = (enforceSquare) => {
    model.userEnforceSquare = enforceSquare;
  };

  publicAPI.allowSquareOnShift = (allow) => {
    model.allowSquareOnShift = allow;
  };

  publicAPI.isSquareEnforced = () =>
    model.userEnforceSquare ||
    (model.isShiftKeyDown && model.allowSquareOnShift);

  publicAPI.setVisibleOnFocus = (visibleOnFocus) => {
    model.visibleOnFocus = visibleOnFocus;
  };

  publicAPI.setXAxis = (xAxis) => {
    vec3.normalize(model.xAxis, xAxis);
  };

  publicAPI.setYAxis = (yAxis) => {
    vec3.normalize(model.yAxis, yAxis);
  };

  publicAPI.setZAxis = (zAxis) => {
    vec3.normalize(model.zAxis, zAxis);
  };

  // --------------------------------------------------------------------------
  // Interactor events
  // --------------------------------------------------------------------------

  publicAPI.handleMouseMove = (callData) => {
    if (model.hasFocus && model.pickable && model.manipulator) {
      const worldCoords = model.manipulator.handleEvent(
        callData,
        model.openGLRenderWindow
      );

      if (worldCoords.length) {
        model.widgetState.getMoveHandle().setOrigin(worldCoords);
      }

      if (model.point1) {
        if (publicAPI.isSquareEnforced()) {
          model.point2 = makeSquareFromPoints(model.point1, worldCoords, model);
        } else {
          model.point2 = worldCoords;
        }

        model.widgetState
          .getRectangleHandle()
          .setBounds(makeBoundsFromPoints(model.point1, model.point2));
      }

      return macro.EVENT_ABORT;
    }

    return macro.VOID;
  };

  // --------------------------------------------------------------------------
  // Left click: Add point / End interaction
  // --------------------------------------------------------------------------

  publicAPI.handleLeftButtonPress = (e) => {
    if (!model.hasFocus || !model.pickable) {
      return macro.VOID;
    }

    if (!model.point1) {
      model.point1 = model.widgetState.getMoveHandle().getOrigin();
      model.widgetState
        .getRectangleHandle()
        .setBounds(makeBoundsFromPoints(model.point1, model.point1));
      publicAPI.invokeStartInteractionEvent();
    } else {
      if (publicAPI.isSquareEnforced()) {
        model.point2 = makeSquareFromPoints(
          model.point1,
          model.widgetState.getMoveHandle().getOrigin(),
          model
        );
      } else {
        model.point2 = model.widgetState.getMoveHandle().getOrigin();
      }
      model.widgetState
        .getRectangleHandle()
        .setBounds(makeBoundsFromPoints(model.point1, model.point2));

      publicAPI.invokeInteractionEvent();
      publicAPI.invokeEndInteractionEvent();
      publicAPI.loseFocus();
    }

    return macro.EVENT_ABORT;
  };

  // --------------------------------------------------------------------------
  // Left relase: Maybe add point / end interaction
  // --------------------------------------------------------------------------

  publicAPI.handleLeftButtonRelease = (e) => {
    if (!model.hasFocus || !model.pickable) {
      return macro.VOID;
    }

    if (model.point1) {
      if (publicAPI.isSquareEnforced()) {
        model.point2 = makeSquareFromPoints(
          model.point1,
          model.widgetState.getMoveHandle().getOrigin(),
          model
        );
      } else {
        model.point2 = model.widgetState.getMoveHandle().getOrigin();
      }

      const distance = vec3.squaredDistance(model.point1, model.point2);

      if (
        distance >
        100 *
          Math.max(
            vec3.squaredLength(model.xAxis),
            vec3.squaredLength(model.yAxis),
            vec3.squaredLength(model.zAxis)
          )
      ) {
        publicAPI.invokeInteractionEvent();
        publicAPI.invokeEndInteractionEvent();
        publicAPI.loseFocus();
      }
    }

    return macro.EVENT_ABORT;
  };

  // --------------------------------------------------------------------------
  // Shift key - enforce square
  // --------------------------------------------------------------------------

  publicAPI.handleKeyDown = ({ key }) => {
    if (key === 'Shift') {
      if (model.hasFocus) {
        model.isShiftKeyDown = true;

        if (model.allowSquareOnShift) {
          if (model.point1) {
            model.point2 = makeSquareFromPoints(
              model.point1,
              model.widgetState.getMoveHandle().getOrigin(),
              model
            );
            model.widgetState
              .getRectangleHandle()
              .setBounds(makeBoundsFromPoints(model.point1, model.point2));
          }
        }
      }
    } else if (key === 'Escape') {
      publicAPI.invokeEndInteractionEvent();
      publicAPI.loseFocus();
    }
  };

  publicAPI.handleKeyUp = ({ key }) => {
    if (key === 'Shift') {
      if (model.hasFocus) {
        model.isShiftKeyDown = false;

        if (!publicAPI.isSquareEnforced()) {
          model.point2 = model.widgetState.getMoveHandle().getOrigin();
          model.widgetState
            .getRectangleHandle()
            .setBounds(makeBoundsFromPoints(model.point1, model.point2));
        }
      }
    }
  };

  // --------------------------------------------------------------------------
  // Focus API - moveHandle follow mouse when widget has focus
  // --------------------------------------------------------------------------

  publicAPI.grabFocus = () => {
    if (!model.hasFocus) {
      model.point1 = null;
      model.point2 = null;
      model.widgetState.getRectangleHandle().setBounds([0, 0, 0, 0, 0, 0]);
      model.isShiftKeyDown = false;
      model.widgetState.getMoveHandle().activate();
      model.interactor.requestAnimation(publicAPI);
      if (model.visibleOnFocus) {
        model.widgetState.getRectangleHandle().setVisible(true);
      }
    }

    model.hasFocus = true;
  };

  // --------------------------------------------------------------------------

  publicAPI.loseFocus = () => {
    if (model.hasFocus) {
      model.isShiftKeyDown = false;
      if (model.visibleOnFocus) {
        model.widgetState.getRectangleHandle().setVisible(false);
      }
    }

    model.hasFocus = false;
  };
}
