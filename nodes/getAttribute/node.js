on.input.element = function() {
  output( {
    element: $.get('element'),
    attribute: $.create($.element.getAttribute($.attribute))
  });
}
