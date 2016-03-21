var r = confirm($.message);
if (r) {
  output.yes = $.get('in');
} else {
  output.no = $.get('in');
}
