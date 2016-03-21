on.input.element = function() {
  $.element.style.display = 'block';
  output({ element: $.get('element') });
};
