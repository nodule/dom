module.exports = {
  name: "getElementById",
  ns: "dom",
  title: "getElementById",
  async: true,
  description: "[Get element by ID](https://developer.mozilla.org/en-US/docs/Web/API/document.getElementById)",
  expose: ["document"],
  phrases: {
    active: "Getting element with id: {{input.id}}"
  },
  ports: {
    input: {
      id: {
        title: "ID",
        type: "string",
        async: true,
        required: true,
        fn: function __ID__(data, source, state, input, $, output) {
          var r = function() {
            output({
              element: $.create(document.getElementById($.id))
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
        type: "HTMLElement"
      }
    }
  },
  state: {}
}