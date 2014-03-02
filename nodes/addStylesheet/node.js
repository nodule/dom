on.input.url = function() {

  var head = document.head || document.getElementsByTagName('head')[0];
  var script = document.createElement('link');

  script.rel  = 'stylesheet';
  script.type = 'text/css';
  script.href = data;
  head.appendChild(script);

};
