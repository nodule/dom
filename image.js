module.exports = {
  name: "image",
  ns: "dom",
  async: true,
  description: "Create an image",
  phrases: {
    active: "Creating Image"
  },
  ports: {
    input: {
      src: {
        type: "string",
        async: true,
        title: "Source path",
        fn: function __SRC__(data, source, state, input, $, output) {
          var r = function() {
            var img = new Image();
            img.onload = function() {
              output({
                image: $.create(this)
              });
            }.bind(img);
            img.src = $.src;
          }.call(this);
          return {
            state: state,
            return: r
          };
        }
      }
    },
    output: {
      image: {
        type: "object",
        title: "Image"
      }
    }
  },
  state: {}
}