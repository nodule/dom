on.input.src = function() {
  var img = new Image();
  img.onload = function() {
    output( { image: $.create(this) } );
  }.bind(img);
  img.src = $.src;
}
