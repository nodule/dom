on.input.element = function() {
  output( {
    element: $.get('element'),
    text: $.create($.element.innerText)
  } );
}
