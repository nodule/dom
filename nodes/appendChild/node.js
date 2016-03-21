on.input.child = function() {
  output( {
    element: $.get('element'),
    out: $.create($.element.appendChild($.child))
  } );
}
