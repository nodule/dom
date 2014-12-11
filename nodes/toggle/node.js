on.input.element = function(data) {
  data.style.display = data.style.display === 'none' ? 'block' : 'none';
  output({ element: data });
};
