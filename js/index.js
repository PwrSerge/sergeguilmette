$(document).foundation();
/**
   * Smooth scrolling when clicking anchor link
   */

  //Click event for inner anchor scrolling
  //Click event for inner anchor scrolling
  $('a[href^="#"]').click(function(e) {
    e.preventDefault(); // Prevents hard jump

    var href = $.attr(this, 'href'),
				  $root = $('html, body');

    $root.animate({
        scrollTop: $(href).offset().top
      }, 600, function() {
        window.location.hash = href;
      });
    });