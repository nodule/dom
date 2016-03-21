on.input.element = function() {
  $.element.style.display = 'none';
  output({ element: $.get('element') });
};
