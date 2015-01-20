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

  if (!state.in) return false;

  if(state.el) {
    state.el.removeEventListener(state.event);
  }
  state.el = input.element;
  state.event = input.event;
  state.preventDefault = input.preventDefault;

  state.el.addEventListener(input.event, state.clickHandler, false);
  output({element: input.element});
};
