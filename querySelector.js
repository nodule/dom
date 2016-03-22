module.exports = {
  name: "querySelector",
  ns: "dom",
  title: "querySelector",
  description: "[Document query selector](https://developer.mozilla.org/en-US/docs/Web/API/document.querySelector)",
  expose: ["document"],
  phrases: {
    active: "Gathering elements matching criteria: {{input.selector}}"
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
        type: "string"
      }
    },
    output: {
      element: {
        title: "Element",
        type: "HTMLElement"
      },
      selection: {
        title: "Selection",
        type: "HTMLElement"
      },
      error: {
        title: "Error",
        type: "Error"
      }
    }
  },
  fn: function querySelector(input, $, output, state, done, cb, on, document) {
    var r = function() {
      var el;
      if ($.element) {
        el = $.element;
        output = {
          element: $.get('element')
        };
      } else {
        el = document;
        output = {
          element: $.create(el)
        };
      }

      var selection = el.querySelector($.selector);
      if (selection) {
        output.selection = $.create(selection);
      } else {
        output.error = $.create(Error('Selector ' + $.selector + ' did not match'));
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