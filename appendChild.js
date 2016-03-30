module.exports = {
  name: "appendChild",
  ns: "dom",
  description: "dom appendChild",
  async: true,
  phrases: {
    active: "Adding child node"
  },
  ports: {
    input: {
      element: {
        type: "HTMLElement",
        title: "Dom Element"
      },
      child: {
        type: "HTMLElement",
        async: true,
        title: "Child Element",
        fn: function __CHILD__(data, source, state, input, $, output) {
          var r = function() {
            output({
              element: $.get('element'),
              out: $.create($.element.appendChild($.child))
            });
          }.call(this);
          return {
            state: state,
            return: r
          };
        }
      }
    },
    output: {
      element: {
        type: "HTMLElement",
        title: "Dom Element"
      },
      out: {
        type: "object"
      }
    }
  },
  state: {}
}