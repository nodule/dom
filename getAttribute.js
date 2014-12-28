module.exports = {
  name: "getAttribute",
  ns: "dom",
  title: "Get Attribute",
  async: true,
  description: "Get attribute",
  expose: ["document"],
  phrases: {
    active: "Getting attribute: {{input.attribute}}"
  },
  ports: {
    input: {
      element: {
        title: "Element",
        type: "HTMLElement",
        async: true,
        fn: function __ELEMENT__(data, x, source, state, input, output, document) {
          var r = function() {
            output({
              element: data,
              attribute: data.getAttribute(input.attribute)
            });
          }.call(this);
          return {
            state: state,
            return: r
          };
        }
      },
      attribute: {
        title: "Attribute",
        type: "string"
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