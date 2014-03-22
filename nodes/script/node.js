output = function() {
  scriptjs(input.in, function() {
    cb({ out: true });
  });
};
