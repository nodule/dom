module.exports = {
  name: "confirm",
  ns: "dom",
  title: "Confirm",
  description: "Confirm whether this input is go or no go",
  phrases: {
    active: "Confirming yes/no"
  },
  ports: {
    input: {
      message: {
        title: "Message",
        type: "any",
        required: "true"
      },
      "in": {
        title: "Input",
        type: "any",
        "default": ""
      }
    },
    output: {
      yes: {
        title: "Yes",
        type: "any"
      },
      no: {
        title: "No",
        type: "any"
      }
    }
  },
  fn: function confirm(input, $, output, state, done, cb, on) {
    var r = function() {
      var r = confirm($.message);
      if (r) {
        output.yes = $.get('in');
      } else {
        output.no = $.get('in');
      }
    }.call(this);
    return {
      output: output,
      state: state,
      on: on,
      return: r
    };
  }
}