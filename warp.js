module.exports = {
  name: "warp",
  ns: "dom",
  description: "dom warp",
  expose: ["window",
    "document"
  ],
  phrases: {
    active: "Warping to frame {{input.selector}}"
  },
  ports: {
    input: {
      selector: {
        type: "string",
        title: "Frame Selector",
        required: true
      }
    },
    output: {
      window: {
        type: "Window",
        title: "Window",
        required: false
      }
    }
  },
  fn: function warp(input, $, output, state, done, cb, on, win, document) {
    var r = function() {
      output = {
        window: $.create(document.querySelector($.selector).contentWindow)
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