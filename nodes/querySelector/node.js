var el = input.element ? input.element : document;
output = {
  element: el
};

var selection = el.querySelector(input.selector);
if(selection) {
  output.selection = selection;
} else {
  output.error = Error('Selector ' + input.selector + ' did not match');
}
