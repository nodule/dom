module.exports = {
  name: "hide",
  ns: "dom",
  async: true,
  description: "dom hide",
  phrases: {
    active: "hideing"
  },
  ports: {
    input: {
      element: {
        type: "HTMLElement",
        title: "Dom Element",
        async: true,
        fn: function __ELEMENT__(data, x, source, state, input, output) {
          var r = function() {
            data.style.display = 'none';
            output({
              element: data
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
      element: {
        type: "HTMLElement",
        title: "Dom Element"
      }
    }
  },
  state: {}
}