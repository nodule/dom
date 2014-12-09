output = function(cb) {

  input.element.addEventListener(input.event, function(ev) {

    if(input.preventDefault) ev.preventDefault();

    cb({
      element: input.element,
      event: ev
    });

  }, false);

};
