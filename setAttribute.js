module.exports = {
  name: "setAttribute",
  ns: "dom",
  title: "Set Attribute",
  async: true,
  description: "Adds a new attribute or changes the value of an existing attribute on the specified element.",
  expose: ["document"],
  phrases: {
    active: "Setting attribute: {{input.attribute}}"
  },
  ports: {
    input: {
      element: {
        title: "Element",
        type: "HTMLElement",
        async: true,
        fn: function __ELEMENT__(data, x, source, state, input, output, document) {
          var r = function() {
            data.setAttribute(input.attribute, input.value);
            output({
              element: data
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
      },
      value: {
        title: "Value",
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