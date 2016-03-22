module.exports = {
  name: "addMutationEvent",
  ns: "dom",
  description: "Add Mutation Event Listener",
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
            state.in = $.in;
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
        fn: function __ELEMENT__(data, x, source, state, input, output) {
          var r = function() {
            if (state.in === undefined) return false;

            if (state.el) {
              state.el.removeEventListener(state.event);
            }
            state.el = $.element;
            state.event = $.event;
            state.preventDefault = $.preventDefault;

            state.el.addEventListener($.event, state.clickHandler, false);
            output({
              element: $.get('element')
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
        "enum": ["DOMSubtreeModified",
          "DOMNodeInserted",
          "DOMNodeRemoved",
          "DOMNodeRemovedFromDocument",
          "DOMNodeInsertedIntoDocument",
          "DOMAttrModified",
          "DOMCharacterDataModified"
        ],
        title: "Dom Event"
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
        type: "MutationEvent",
        title: "Event"
      }
    }
  },
  state: {
    "in": undefined,
    event: null,
    preventDefault: null,
    clickHandler: function(ev) {
      if (state.preventDefault) ev.preventDefault();
      output({
        out: $.clone('in', state.in),
        event: $.create(ev)
      });
    }
  }
}