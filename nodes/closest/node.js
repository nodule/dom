on.input.element = function(data) {
  output({
    selection: closest(
      data, input.selector, input.checkSelf,
      input.within || document
    ),
    element: data
  });
};
