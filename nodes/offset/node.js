var rect = $.element.getBoundingClientRect();
output = {
  element: $.element,
  left: rect.left + $.win.pageXOffset,
  top: rect.top + $.win.pageYOffset,
  width: rect.width,
  height: rect.height
};
