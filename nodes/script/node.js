output = function() {
  scriptjs.get(input.url, function() {
    cb({ out: true });
  });
};
