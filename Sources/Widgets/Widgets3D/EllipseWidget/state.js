import vtkStateBuilder from 'vtk.js/Sources/Widgets/Core/StateBuilder';

export default function generateState() {
  return vtkStateBuilder
    .createBuilder()
    .addStateFromMixin({
      labels: ['moveHandle'],
      mixins: ['origin', 'color', 'scale1', 'visible', 'manipulator'],
      name: 'moveHandle',
      initialValues: {
        scale1: 0.3,
        origin: [1, 0, 0],
        visible: false,
      },
    })
    .addStateFromMixin({
      labels: ['ellipseHandle'],
      mixins: ['origin', 'color', 'scale3', 'visible', 'direction'],
      name: 'ellipseHandle',
      initialValues: {
        visible: false,
        direction: [0, 0, 1],
        scale3: [1, 1, 1],
      },
    })
    .build();
}
