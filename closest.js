module.exports = {
  name: "closest",
  ns: "dom",
  title: "Closest",
  async: true,
  description: " Finds the closest parent that matches a selector.",
  expose: ["document"],
  dependencies: {
    npm: {
      "discore-closest": require('discore-closest')
    }
  },
  phrases: {
    active: "Finding closest parent: {{input.selector}}"
  },
  ports: {
    input: {
      element: {
        title: "Element",
        description: "will check this elements parents",
        type: "HTMLElement",
        async: true,
        fn: function __ELEMENT__(data, source, state, input, $, output, discore_closest) {
          var r = function() {
            var sel = discore_closest(
              $.element, $.selector, $.checkSelf,
              $.within || document
            );
            var res = {
              element: $.get('element')
            };
            if (sel) {
              res.selection = $.create(sel);
            } else {
              res.error = $.create(new Error('Selector didn\'t match:' + $.selector));
            }

            output(res);
          }.call(this);
          return {
            state: state,
            return: r
          };
        }
      },
      selector: {
        title: "Selector",
        description: "CSS selector to match parents",
        type: "string"
      },
      checkSelf: {
        title: "Check Self",
        description: "check element. If falsey, will begin with element.parentNode and is synonymous to $.fn.parents. Otherwise, it's $.fn.closest.",
        type: "boolean",
        "default": false
      },
      within: {
        title: "Within",
        description: "check only within this element. By default, document",
        type: "HTMLElement",
        required: false
      }
    },
    output: {
      element: {
        title: "Element",
        type: "HTMLElement"
      },
      selection: {
        title: "Selection",
        type: "HTMLElement"
      },
      error: {
        title: "Error",
        type: "Error"
      }
    }
  },
  state: {}
}