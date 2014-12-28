module.exports = {
  name: "ready",
  ns: "dom",
  title: "Dom Ready",
  description: "Let's you know when the dom is ready",
  phrases: {
    active: "Waiting until dom is ready..."
  },
  ports: {
    input: {},
    output: {
      out: {
        title: "Ready",
        type: "any"
      }
    }
  },
  dependencies: {
    npm: {
      domready: require('domready')
    }
  },
  fn: function ready(input, output, state, done, cb, on, domready) {
    var r = function() {
      domready(function() {
        output({
          out: true
        });
      });
    }.call(this);
    return {
      output: output,
      state: state,
      on: on,
      return: r
    };
  }
}