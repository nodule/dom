module.exports = {
  name: "setValue",
  ns: "dom",
  description: "Set value of an input element",
  phrases: {
    active: "Setting value for {input.element.name}"
  },
  ports: {
    input: {
      "in": {
        type: "any",
        title: "Value"
      },
      element: {
        type: "HTMLElement",
        title: "Dom Element",
        async: true
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
  fn: function setValue(input, $, output, state, done, cb, on) {
    var r = function() {
      $.element.value = $.in
      output.element = $.get('element')
      output.out = $.get('in')
    }.call(this);
    return {
      output: output,
      state: state,
      on: on,
      return: r
    };
  }
}