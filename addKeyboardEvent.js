module.exports = {
  name: "addKeyboardEvent",
  ns: "dom",
  description: "Add Keyboard Event Listener",
  phrases: {
    active: "Adding {{input.event}} handler"
  },
  ports: {
    input: {
      element: {
        type: "HTMLElement",
        title: "Dom Element",
        required: false
      },
      preventDefault: {
        type: "boolean",
        title: "Prevent Default Event",
        "default": true
      },
      event: {
        type: "string",
        "enum": ["keydown",
          "keypress",
          "keyup"
        ],
        title: "Dom Event"
      }
    },
    output: {
      element: {
        type: "HTMLElement",
        title: "Dom Element"
      },
      event: {
        type: "object",
        title: "Event"
      }
    }
  },
  fn: function addKeyboardEvent(input, output, state, done, cb, on) {
    var r = function() {
      var el = input.element || document;

      el.addEventListener(input.event, function(ev) {

        if (input.preventDefault) ev.preventDefault();

        output({
          element: el,
          event: ev
        });

      }, false);
    }.call(this);
    return {
      output: output,
      state: state,
      on: on,
      return: r
    };
  }
}