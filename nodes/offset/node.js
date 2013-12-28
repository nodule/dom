var rect = input.element.getBoundingClientRect();
output = {
  left: rect.left + input.win.pageXOffset,
  top: rect.top + input.win.pageYOffset,
  width: rect.width,
  height: rect.height
};
