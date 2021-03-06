module.exports = {
  name: "keyboard",
  ns: "dom",
  description: "Gives the keyboard a first class identity, normalizes keyboard events across browsers, and allows binding to multiple keys.",
  phrases: {
    active: "Handling keyboard"
  },
  ports: {
    input: {
      element: {
        type: "HTMLElement",
        title: "Dom Element"
      },
      "in": {
        type: "string",
        title: "Key(s)",
        description: "a string that can be any key name or a combination of key names separated by '+' or '->'. The '+' combinator requires the keys be held together, '->' requires they be pressed in a specific sequence."
      },
      filter: {
        type: "string",
        "enum": ["activate",
          "release",
          "repeat",
          "press"
        ],
        title: "Filter",
        "default": null
      }
    },
    output: {
      element: {
        type: "HTMLElement",
        title: "Dom Element"
      },
      out: {
        type: "any",
        title: "Keyboard event(s)"
      }
    }
  },
  dependencies: {
    npm: {
      keyboard: require('keyboard')
    }
  },
  fn: function keyboard(input, $, output, state, done, cb, on, keyboard) {
    var r = function() {
      var kb = new keyboard($.element)

      // todo: should be async.keyboard( 'on', $.in, $.filter, function keyboardCallback(element,out) {cb({element: element, out: out});});
    }.call(this);
    return {
      output: output,
      state: state,
      on: on,
      return: r
    };
  }
}