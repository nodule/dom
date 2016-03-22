module.exports = {
  name: "toggle",
  ns: "dom",
  async: true,
  description: "dom toggle",
  phrases: {
    active: "toggling"
  },
  ports: {
    input: {
      element: {
        type: "HTMLElement",
        title: "Dom Element",
        async: true,
        fn: function __ELEMENT__(data, x, source, state, input, output) {
          var r = function() {
            $.element.style.display = $.element.style.display === 'none' ? 'block' : 'none';
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