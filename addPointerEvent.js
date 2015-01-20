module.exports = {
  name: "addPointerEvent",
  ns: "dom",
  description: "Add Pointer Event Listener",
  async: true,
  phrases: {
    active: "Adding {{input.event}} handler"
  },
  ports: {
    input: {
      "in": {
        title: "Input",
        type: "any",
        async: true,
        "default": null,
        fn: function __IN__(data, x, source, state, input, output) {
          var r = function() {
            state.in = data;
          }.call(this);
          return {
            state: state,
            return: r
          };
        }
      },
      element: {
        type: "HTMLElement",
        title: "Dom Element",
        async: true,
        required: false,
        fn: function __ELEMENT__(data, x, source, state, input, output) {
          var r = function() {
            if (state.el) {
              state.el.removeEventListener(state.event);
              state.el.innerHTML = null;
            }

            state.event = input.event;
            state.preventDefault = input.preventDefault;

            var el = input.element || document;
            el.addEventListener(input.event, state.clickHandler, false);
            output({
              element: el
            });
          }.call(this);
          return {
            state: state,
            return: r
          };
        }
      },
      preventDefault: {
        type: "boolean",
        title: "Prevent Default Event",
        "default": true
      },
      event: {
        type: "string",
        "enum": ["pointerdown",
          "pointerup",
          "pointercancel",
          "pointermove",
          "pointerover",
          "pointerout",
          "pointerenter",
          "pointerleave",
          "gotpointercapture",
          "lostpointercapture"
        ],
        title: "Pointer Event"
      }
    },
    output: {
      element: {
        type: "HTMLElement",
        title: "Dom Element"
      },
      out: {
        type: "any",
        title: "Output"
      },
      event: {
        type: "object",
        title: "Event"
      }
    }
  },
  state: {
    "in": null,
    event: null,
    preventDefault: null,
    clickHandler: function(ev) {
      if (state.preventDefault) ev.preventDefault();
      output({
        out: state.in,
        event: ev
      });
    }
  }
}