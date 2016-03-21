module.exports = {
  name: "createElement",
  ns: "dom",
  async: true,
  description: "dom createElement",
  phrases: {
    active: "Creating element"
  },
  ports: {
    input: {
      "in": {
        type: "string",
        title: "Tagname",
        async: true,
        "default": "div",
        fn: function __IN__(data, x, source, state, input, output) {
          var r = function() {
            output({
              out: document.createElement(data)
            });
          }.call(this);
          return {
            state: state,
            return: r
          };
        }
      }
    },
    output: {
      out: {
        type: "HTMLElement"
      }
    }
  },
  state: {}
}