var rect = input.element.getBoundingClientRect();
output = {
  element: input.element,
  left: rect.left + input.win.pageXOffset,
  top: rect.top + input.win.pageYOffset,
  width: rect.width,
  height: rect.height
};
