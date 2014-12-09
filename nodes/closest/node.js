on.input.element = function(data) {
  var sel = discore_closest(
    data, input.selector, input.checkSelf,
    input.within || document
  );
  var res = { element: data };
  if (sel) {
    res.selection = sel;
  } else {
    res.error = new Error('Selector didn\'t match:' + input.selector);
  }

  output(res);

};
