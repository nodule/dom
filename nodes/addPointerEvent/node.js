state.in = undefined;
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
  state.in = $.in;
};

on.input.element = function() {
  if (state.in === undefined) return false;

  if(state.el) {
    state.el.removeEventListener(state.event);
  }
  state.el = $.element;
  state.event = $.event;
  state.preventDefault = $.preventDefault;

  state.el.addEventListener($.event, state.clickHandler, false);
  output({element: $.element});
};
