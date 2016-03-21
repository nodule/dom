on.input.element = function() {
  var sel = discore_closest(
    $.element, $.selector, $.checkSelf,
    $.within || document
  );
  var res = { element: $.element};
  if (sel) {
    res.selection = sel;
  } else {
    res.error = new Error('Selector didn\'t match:' + $.selector);
  }

  output(res);

};
