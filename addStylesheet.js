module.exports = {
  name: "addStylesheet",
  ns: "dom",
  async: true,
  description: "Adds a stylesheet to the head of the HTML page",
  phrases: {
    active: "Attaching script {input.url}"
  },
  ports: {
    input: {
      url: {
        type: "string",
        async: true,
        format: "url",
        title: "Script Url",
        fn: function __URL__(data, source, state, input, $, output) {
          var r = function() {
            var head = document.head || document.getElementsByTagName('head')[0];
            var link = document.createElement('link');

            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = $.url;
            head.appendChild(link);

            output({
              head: $.create(head),
              link: $.create(link)
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
      head: {
        type: "HTMLElement",
        title: "Head"
      },
      link: {
        type: "HTMLElement",
        title: "Link"
      }
    }
  },
  state: {}
}