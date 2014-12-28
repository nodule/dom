module.exports = {
  name: "alert",
  ns: "dom",
  title: "Alert",
  description: "Alert",
  phrases: {
    active: "Showing alert"
  },
  ports: {
    input: {
      message: {
        title: "Message",
        type: "any",
        required: "true",
        fn: function __MESSAGE__(data, x, source, state, input, output) {
          var r = function() {
            alert(data);
          }.call(this);
          return {
            state: state,
            return: r
          };
        }
      }
    }
  },
  state: {}
}