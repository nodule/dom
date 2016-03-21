on.input.element = function() {
  var sel = discore_closest(
    input.element, input.selector, input.checkSelf,
    input.within || document
  );
  var res = { element: input.element};
  if (sel) {
    res.selection = sel;
  } else {
    res.error = new Error('Selector didn\'t match:' + input.selector);
  }

  output(res);

};
