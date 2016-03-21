on.input.src = function() {
  var img = new Image();
  img.onload = function() {
    output( { image: this } );
  }.bind(img);
  img.src = input.src;
}
