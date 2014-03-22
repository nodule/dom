output = function() {
  scriptjs([input.url], function() {
    cb({ out: true });
  });
};
