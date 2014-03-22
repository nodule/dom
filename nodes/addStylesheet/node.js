on.input.url = function() {

  var head = document.head || document.getElementsByTagName('head')[0];
  var link = document.createElement('link');

  link.rel  = 'stylesheet';
  link.type = 'text/css';
  link.href = data;
  head.appendChild(link);

  output({
    head: head,
    link: link
  });

};
