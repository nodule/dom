module.exports = {
  name: "getValue",
  ns: "dom",
  async: true,
  description: "Take value from an input element",
  phrases: {
    active: "Reading value from {input.element.name}"
  },
  ports: {
    input: {
      element: {
        type: "HTMLElement",
        title: "Dom Element",
        async: true,
        fn: function __ELEMENT__(data, x, source, state, input, output) {
          var r = function() {
            output({
              element: $.get('element'),
              out: $.create($.element.value) // never ownProperty...
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
        type: "string",
        title: "Value"
      }
    }
  },
  state: {}
}