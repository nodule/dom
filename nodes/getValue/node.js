on.input.element = function(data) {
  output({
    element: data,
    out: data.value // never ownProperty...
  });
};
