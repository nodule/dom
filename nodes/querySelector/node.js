var el = $.element ? $.element : document;
output = {
  element: el
};

var selection = el.querySelector($.selector);
if(selection) {
  output.selection = selection;
} else {
  output.error = Error('Selector ' + $.selector + ' did not match');
}
