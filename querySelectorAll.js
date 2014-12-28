module.exports = {
  name: "querySelectorAll",
  ns: "dom",
  title: "querySelectorAll",
  expose: ["window",
    "document"
  ],
  description: "[Document querySelectorAll](https://developer.mozilla.org/en-US/docs/Web/API/document.querySelectorAll)",
  phrases: {
    active: "Gathering all elements matching criteria: {{input.selector}}"
  },
  ports: {
    input: {
      element: {
        title: "Element",
        type: "HTMLElement",
        "default": null
      },
      selector: {
        title: "Selector",
        type: "string",
        required: true
      }
    },
    output: {
      element: {
        title: "Element",
        type: "HTMLElement",
        "default": null
      },
      selection: {
        type: "object"
      },
      error: {
        type: "Error",
        title: "Error"
      }
    }
  },
  fn: function querySelectorAll(input, output, state, done, cb, on, win, document) {
    var r = function() {
      var el = input.element ? input.element : document;
      output = {
        element: el
      };
      var selection = el.querySelectorAll(input.selector);
      if (selection) {
        output.selection = selection;
      } else {
        output.error = Error('Selector ' + input.selector + ' did not match');
      }
    }.call(this);
    return {
      output: output,
      state: state,
      on: on,
      return: r
    };
  }
}