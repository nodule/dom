state.in = null;

on.input.in = function() {
  state.in = data;
};

output = function(cb) {

  var el = input.element || document;

  el.addEventListener(input.event, function(ev) {

    if(input.preventDefault) ev.preventDefault();

    cb({
      out: state.in,
      event: ev
    });

  }, false);

  output({element: el});
};
