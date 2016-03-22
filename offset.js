module.exports = {
  name: "offset",
  ns: "dom",
  description: "dom offset",
  phrases: {
    active: "Calculating offset"
  },
  ports: {
    input: {
      window: {
        type: "Window",
        title: "Window"
      },
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
      top: {
        type: "number",
        title: "Top"
      },
      left: {
        type: "number",
        title: "Left"
      },
      width: {
        type: "number",
        title: "Width"
      },
      height: {
        type: "number",
        title: "Height"
      }
    }
  },
  fn: function offset(input, $, output, state, done, cb, on) {
    var r = function() {
      var rect = $.element.getBoundingClientRect();
      output = {
        element: $.get('element'),
        left: $.create(rect.left + $.win.pageXOffset),
        top: $.create(rect.top + $.win.pageYOffset),
        width: $.create(rect.width),
        height: $.create(rect.height)
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