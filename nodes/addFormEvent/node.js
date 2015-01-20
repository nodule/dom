state.in = null;
state.event = null;
state.preventDefault = null;

state.clickHandler = function(ev) {
  if(state.preventDefault) ev.preventDefault();
  output({
    out: state.in,
    event: ev
  });
};

on.input.in = function() {
  state.in = data;
};

on.input.element = function() {

  if(state.el) {
    state.el.removeEventListener(state.event);
    state.el.innerHTML = null;
  }

  state.event = input.event;
  state.preventDefault = input.preventDefault;

  var el = input.element || document;
  el.addEventListener(input.event, state.clickHandler, false);
  output({element: el});
};
