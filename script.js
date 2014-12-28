module.exports = {
  name: "script",
  ns: "dom",
  description: "Asyncronous JavaScript loader and dependency manager",
  phrases: {
    active: "Loading script(s)"
  },
  ports: {
    input: {
      "in": {
        type: "array",
        title: "Url(s)",
        items: {
          type: "string",
          format: "url",
          title: "Url"
        }
      }
    },
    output: {
      out: {
        title: "Success",
        type: "boolean"
      }
    }
  },
  dependencies: {
    npm: {
      scriptjs: require('scriptjs')
    }
  },
  fn: function script(input, output, state, done, cb, on, scriptjs) {
    var r = function() {
      scriptjs(input.in, function() {
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