import registerWebworker from 'webworker-promise/lib/register';

import { SlicingMode } from 'vtk.js/Sources/Rendering/Core/ImageMapper/Constants';

const globals = {
  // single-component labelmap
  buffer: null,
  dimensions: [0, 0, 0],
  prevPoint: null,
  slicingMode: null,
};

function handlePaint({ point, radius }) {
  const dims = globals.dimensions;
  const [x, y, z] = point;
  const [rx, ry, rz] = radius;

  if (!globals.prevPoint) {
    globals.prevPoint = point;
  }

  let xstart = Math.floor(Math.min(dims[0] - 1, Math.max(0, x - rx)));
  let xend = Math.floor(Math.min(dims[0] - 1, Math.max(0, x + rx)));
  let ystart = Math.floor(Math.min(dims[1] - 1, Math.max(0, y - ry)));
  let yend = Math.floor(Math.min(dims[1] - 1, Math.max(0, y + ry)));
  let zstart = Math.floor(Math.min(dims[2] - 1, Math.max(0, z - rz)));
  let zend = Math.floor(Math.min(dims[2] - 1, Math.max(0, z + rz)));

  if (globals.slicingMode) {
    if (globals.slicingMode === SlicingMode.X) {
      xstart = x;
      xend = x;
    } else if (globals.slicingMode === SlicingMode.Y) {
      ystart = y;
      yend = y;
    } else if (globals.slicingMode === SlicingMode.Z) {
      zstart = z;
      zend = z;
    }
  }

  const jStride = dims[0];
  const kStride = dims[0] * dims[1];

  // DDA params
  const delta = [
    point[0] - globals.prevPoint[0],
    point[1] - globals.prevPoint[1],
    point[2] - globals.prevPoint[2],
  ];
  const inc = [1, 1, 1];
  for (let i = 0; i < 3; i++) {
    if (delta[i] < 0) {
      delta[i] = -delta[i];
      inc[i] = -1;
    }
    delta[i]++;
  }
  const step = Math.max(...delta);

  // naive algo
  for (let i = xstart; i <= xend; i++) {
    for (let j = ystart; j <= yend; j++) {
      for (let k = zstart; k <= zend; k++) {
        const rel = [i - x, j - y, k - z];
        const ival = rel[0] / rx;
        const jval = rel[1] / ry;
        const kval = rel[2] / rz;
        if (ival * ival + jval * jval + kval * kval <= 1) {
          const pt = [
            rel[0] + globals.prevPoint[0],
            rel[1] + globals.prevPoint[1],
            rel[2] + globals.prevPoint[2],
          ];

          // DDA
          const thresh = [step, step, step];
          for (let s = 0; s <= step; s++) {
            if (
              pt[0] >= 0 &&
              pt[0] < dims[0] &&
              pt[1] >= 0 &&
              pt[1] < dims[1] &&
              pt[2] >= 0 &&
              pt[2] < dims[2]
            ) {
              const index = pt[0] + pt[1] * jStride + pt[2] * kStride;
              globals.buffer[index] = 1;
            }

            for (let ii = 0; ii < 3; ii++) {
              thresh[ii] -= delta[ii];
              if (thresh[ii] < 0) {
                thresh[ii] = step;
                pt[ii] += inc[ii];
              }
            }
          }
        }
      }
    }
  }

  globals.prevPoint = point;
}

function handlePaintRectangle({ point1, point2 }) {
  const [x1, y1, z1] = point1;
  const [x2, y2, z2] = point2;

  const xstart = Math.max(Math.min(x1, x2), 0);
  const xend = Math.min(Math.max(x1, x2), globals.dimensions[0] - 1);
  const ystart = Math.max(Math.min(y1, y2), 0);
  const yend = Math.min(Math.max(y1, y2), globals.dimensions[1] - 1);
  const zstart = Math.max(Math.min(z1, z2), 0);
  const zend = Math.min(Math.max(z1, z2), globals.dimensions[2] - 1);

  const jStride = globals.dimensions[0];
  const kStride = globals.dimensions[0] * globals.dimensions[1];

  for (let k = zstart; k <= zend; k++) {
    for (let j = ystart; j <= yend; j++) {
      const index = j * jStride + k * kStride;
      globals.buffer.fill(1, index + xstart, index + xend + 1);
    }
  }
}

registerWebworker()
  .operation('start', ({ bufferType, dimensions, slicingMode }) => {
    const bufferSize = dimensions[0] * dimensions[1] * dimensions[2];
    /* eslint-disable-next-line */
    globals.buffer = new self[bufferType](bufferSize);
    globals.dimensions = dimensions;
    globals.prevPoint = null;
    globals.slicingMode = slicingMode;
  })
  .operation('paint', handlePaint)
  .operation('paintRectangle', handlePaintRectangle)
  .operation(
    'end',
    () =>
      new registerWebworker.TransferableResponse(globals.buffer.buffer, [
        globals.buffer.buffer,
      ])
  );
