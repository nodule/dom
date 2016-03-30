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
        fn: function __ELEMENT__(data, source, state, input, $, output) {
          var r = function() {
            output({
              element: $.get('element'),
              attribute: $.create($.element.getAttribute($.attribute))
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
      },
      attribute: {
        title: "Attribute",
        type: "string"
      }
    }
  },
  state: {}
}