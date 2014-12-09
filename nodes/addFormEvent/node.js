output = function(cb) {

  var el = input.element || document;

  el.addEventListener(input.event, function(ev) {

    if(input.preventDefault) ev.preventDefault();

    cb({
      element: el,
      event: ev
    });

  }, false);

};
