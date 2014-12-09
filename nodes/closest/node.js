on.input.element = function(data) {
  output({
    selection: discore_closest(
      data, input.selector, input.checkSelf,
      input.within || document
    ),
    element: data
  });
};
