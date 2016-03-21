on.input.element = function() {
  output({
    element: input.element,
    out: input.element.value // never ownProperty...
  });
};
