on.input.src = function() {
  var img = new Image();
  img.onload = function() {
    output( { image: img } );
  };
  img.src = data;
}
