on.input.element = function() {
  $.element.style.display = $.element.style.display === 'none' ? 'block' : 'none';
  output({ element: $.element });
};
