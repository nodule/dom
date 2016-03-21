on.input.element = function() {
  var sel = discore_closest(
    $.element, $.selector, $.checkSelf,
    $.within || document
  );
  var res = { element: $.get('element')};
  if (sel) {
    res.selection = $.create(sel);
  } else {
    res.error = $.create(new Error('Selector didn\'t match:' + $.selector));
  }

  output(res);
};
