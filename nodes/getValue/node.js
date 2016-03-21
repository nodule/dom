on.input.element = function() {
  output({
    element: $.element,
    out: $.element.value // never ownProperty...
  });
};
