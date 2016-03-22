module.exports = {
  name: "getText",
  ns: "dom",
  async: true,
  description: "dom getText",
  phrases: {
    active: "Getting text"
  },
  ports: {
    input: {
      element: {
        type: "HTMLElement",
        async: true,
        title: "Dom Element",
        fn: function __ELEMENT__(data, x, source, state, input, output) {
          var r = function() {
            output({
              element: $.get('element'),
              text: $.create($.element.innerText)
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
        async: true,
        title: "Dom Element"
      },
      text: {
        type: "string",
        title: "Text"
      }
    }
  },
  state: {}
}