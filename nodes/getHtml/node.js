on.input.element = function() {
  output( {
    element: $.get('element'),
    html: $.create($.element.innerHTML)
  } );
}
