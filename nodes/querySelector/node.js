var el;
if ($.element) {
  el = $.element;
  output = {
    element: $.get('element') 
  };
} else {
  el = document;
  output = {
    element: $.create(el) 
  };
}

var selection = el.querySelector($.selector);
if(selection) {
  output.selection = $.create(selection);
} else {
  output.error = $.create(Error('Selector ' + $.selector + ' did not match'));
}
