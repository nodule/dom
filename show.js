module.exports = {
  name: "show",
  ns: "dom",
  async: true,
  description: "dom show",
  phrases: {
    active: "Showing"
  },
  ports: {
    input: {
      element: {
        type: "HTMLElement",
        title: "Dom Element",
        async: true,
        fn: function __ELEMENT__(data, source, state, input, $, output) {
          var r = function() {
            $.element.style.display = 'block';
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