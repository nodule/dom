module.exports = {
  name: "setHtml",
  ns: "dom",
  description: "dom setHtml",
  async: true,
  phrases: {
    active: "Adding html"
  },
  ports: {
    input: {
      element: {
        type: "HTMLElement",
        title: "Dom Element"
      },
      html: {
        type: "string",
        format: "html",
        title: "html",
        async: true,
        fn: function __HTML__(data, source, state, input, $, output) {
          var r = function() {
            $.element.innerHTML = $.html;
            output({
              element: $.get('element')
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