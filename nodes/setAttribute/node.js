on.input.element = function() {
  $.element.setAttribute($.attribute, $.value);
  output( {
    element: $.get('element')
  });
}
