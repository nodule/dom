on.input.url = function() {
  var head = document.head || document.getElementsByTagName('head')[0];
  var link = document.createElement('link');

  link.rel  = 'stylesheet';
  link.type = 'text/css';
  link.href = $.url;
  head.appendChild(link);

  output({
    head: $.create(head),
    link: $.create(link)
  });
};
