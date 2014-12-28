module.exports = {
  name: "document",
  ns: "dom",
  description: "dom document",
  expose: ["window"],
  phrases: {
    active: "Providing the dom document of the current window"
  },
  ports: {
    input: {
      window: {
        type: "Window",
        title: "Window",
        required: false
      }
    },
    output: {
      window: {
        type: "Window",
        title: "Window",
        required: false
      },
      document: {
        type: "HTMLDocument"
      }
    }
  },
  fn: function document(input, output, state, done, cb, on, win) {
    var r = function() {
      win = input.window || win;
      output = {
        document: win.document,
        window: win
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