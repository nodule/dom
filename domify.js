module.exports = {
  name: "domify",
  ns: "dom",
  title: "Domify",
  description: "Turn HTML into DOM elements x-browser",
  phrases: {
    active: "Domifying HTML"
  },
  ports: {
    input: {
      "in": {
        title: "Html",
        type: "string",
        format: "html",
        required: true
      }
    },
    output: {
      out: {
        title: "Dom Elements",
        type: ["HTMLElement",
          "DocumentFragment"
        ]
      }
    }
  },
  dependencies: {
    npm: {
      domify: require('domify')
    }
  },
  fn: function domify(input, $, output, state, done, cb, on, domify) {
    var r = function() {
      output.out = $.write('in', domify($.in));
    }.call(this);
    return {
      output: output,
      state: state,
      on: on,
      return: r
    };
  }
}