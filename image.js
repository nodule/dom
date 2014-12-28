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
        fn: function __SRC__(data, x, source, state, input, output) {
          var r = function() {
            var img = new Image();
            img.onload = function() {
              output({
                image: this
              });
            }.bind(img);
            img.src = data;
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