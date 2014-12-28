module.exports = {
  name: "width",
  ns: "dom",
  description: "dom width",
  phrases: {
    active: "Calculating width"
  },
  ports: {
    input: {
      element: {
        type: "HTMLElement",
        title: "Dom Element"
      }
    },
    output: {
      element: {
        type: "HTMLElement",
        title: "Dom Element"
      },
      width: {
        type: "number",
        title: "Width"
      }
    }
  },
  fn: function width(input, output, state, done, cb, on) {
    var r = function() {
      output = {
        element: input.element,
        width: input.element.getBoundingClientRect().width
      };
    }.call(this);
    return {
      output: output,
      state: state,
      on: on,
      return: r
    };
  }
}