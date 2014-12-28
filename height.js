module.exports = {
  name: "height",
  ns: "dom",
  description: "dom height",
  phrases: {
    active: "Calculating height"
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
      height: {
        type: "number",
        title: "Height"
      }
    }
  },
  fn: function height(input, output, state, done, cb, on) {
    var r = function() {
      output = {
        element: input.element,
        height: input.element.getBoundingClientRect().height
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