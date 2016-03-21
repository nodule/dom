on.input.element = function() {
  input.element.style.display = input.element.style.display === 'none' ? 'block' : 'none';
  output({ element: input.element });
};
