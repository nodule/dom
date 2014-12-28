module.exports = {
  name: "getHtml",
  ns: "dom",
  async: true,
  description: "dom getHtml",
  phrases: {
    active: "Getting html"
  },
  ports: {
    input: {
      element: {
        type: "HTMLElement",
        async: true,
        title: "Dom Element",
        fn: function __ELEMENT__(data, x, source, state, input, output) {
          var r = function() {
            output({
              element: data,
              html: data.innerHTML
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
        async: true,
        title: "Dom Element"
      },
      html: {
        type: "string",
        format: "html",
        title: "HTML"
      }
    }
  },
  state: {}
}