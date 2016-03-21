output = function() {
  scriptjs($.in, function() {
    cb({ out: $.get('in') });
  });
};
