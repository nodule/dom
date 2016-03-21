var rect = $.element.getBoundingClientRect();
output = {
  element: $.get('element'),
  left: $.create(rect.left + $.win.pageXOffset),
  top: $.create(rect.top + $.win.pageYOffset),
  width: $.create(rect.width),
  height: $.create(rect.height)
};
