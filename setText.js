module.exports = {
  name: "setText",
  ns: "dom",
  description: "dom setText",
  phrases: {
    active: "Adding text"
  },
  ports: {
    input: {
      element: {
        type: "HTMLElement",
        title: "Dom Element"
      },
      text: {
        type: "string",
        title: "text"
      }
    },
    output: {
      element: {
        type: "HTMLElement",
        title: "Dom Element"
      }
    }
  },
  fn: function setText(input, output, state, done, cb, on) {
    var r = function() {
      input.element.innerText = input.text;
      output = {
        element: input.element
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