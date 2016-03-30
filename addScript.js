module.exports = {
  name: "addScript",
  ns: "dom",
  async: true,
  description: "Adds a script to the head of the HTML page",
  phrases: {
    active: "Attaching script {input.url}"
  },
  dependencies: {
    npm: {
      "load-script": require('load-script')
    }
  },
  ports: {
    input: {
      url: {
        type: "string",
        title: "Script Url",
        async: true,
        fn: function __URL__(data, source, state, input, $, output, load_script) {
          var r = function() {
            load_script.load($.url, function() {

            });
          }.call(this);
          return {
            state: state,
            return: r
          };
        }
      }
    },
    output: {}
  },
  state: {}
}