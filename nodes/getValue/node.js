on.input.element = function() {
  output({
    element: $.get('element'),
    out: $.create($.element.value) // never ownProperty...
  });
};
