/**
 * SergeGuilmette-site
 * @version v1.0.0
 * @author serge guilmette http://www.sergeguilmette.me
 * @license ISC
 */

/**
 * Browserify bundle modules
 */

var $ = require('jquery');
//require('./modernizr.js');
require('./plugins.js');
var Modernizr = require('modernizr');

//require('svg4everybody');
//var Snap = require('snapsvg')

// First lets create our drawing surface out of existing SVG element
// If you want to create new surface just provide dimensions
//like s = Snap(800, 600);
// var s = Snap("#svg";
// // Lets create big circle in the middle:
// var bigCircle = s.circle(150, 150, 100);
// // By default its black, lets change its attributes
// bigCircle.attr({
//   fill: "#bada55",
// });

/*
 *  Header  -- Slide menu
 */

$(function() {

  var $page = $('.inner-wrapper'),
    $h2ht = $('h2').height(),
    $navToggle = $('.nav-toggle'),
    $mainNavigation = $('.nav-main'),
    $header = $('.header-container'),
    $headerHt = $header.height(),
    $menuHt = $mainNavigation.height(),
    $totalmenuHt = $headerHt + $menuHt,
    $main = $('main'),
    $root = $('html, body');

  //remove transitions on window load and resize
  $(window).on('load resize', function() {
    if (Modernizr.mq('(min-width:500px)')) {
      $mainNavigation.removeClass('open');
    }
    if (Modernizr.mq('(min-width:700px)')) {
      $page.offset({
        top: 0
      });
      $mainNavigation.offset({
        top: 0
      });
    } else {
      $mainNavigation.offset({
        top: -$totalmenuHt
      });
      $page.offset({
        top: -$menuHt + $headerHt
      });
    }
  });

  //togle class for for sliding menu
  $navToggle.on('click', function() {
    $page.toggleClass('is-open');
    $mainNavigation.toggleClass('is-open');
  });

  $page.on('click', function(e) {
    $mainNavigation.removeClass('is-open');
    $page.removeClass('is-open');
    e.preventDefault();
  });

  //animate main menu on click event
  $('.nav-toggle').on('click', function(e) {
    if ($mainNavigation.hasClass('is-open')) {
      $mainNavigation.animate({
        top: 0
      }, 300);
      $page.animate({
        top: 0
      }, 300);
    } else {
      $mainNavigation.animate({
        top: -$totalmenuHt
      }, 300);
      $page.animate({
        top: -$menuHt
      }, 300);
    }
  });

  /**
   * Smooth scrolling when clicking anchor link
   */

  // // fixed  header  on scroll
  // $(window).scroll(function() {
  //   if ($(this).scrollTop() > $headerHt) {
  //     $header.addClass("header-container-fixed");
  //     $('body').addClass("fix-body");
  //   } else {
  //     $header.removeClass("header-container-fixed");
  //     $('body').removeClass("fix-body");
  //   }
  // });

  //Click event for inner anchor scrolling
  $('a[href^="#"]').click(function(e) {
    e.preventDefault(); // Prevents hard jump

    var href = $.attr(this, 'href');

    if ($('.nav-toggle').css('display') === 'none') {
      $root.animate({
        scrollTop: $(href).offset().top
      }, 600, function() {
        window.location.hash = href;
      });

    } else {
      $root.animate({
        scrollTop: $(href).offset().top
      }, 600, function() {
        window.location.hash = href;
      });
    }
    return false;
  });

  //Form event
  $('#submit_btn').on('click', function(e) {

    // $("#sgform").submit();

    var $message = $('textarea#message').val(),
      $name = $('name').val(),
      $email = $('email').val();

    $.ajax({
      url: '//formspree.io/sergeguilmette@gmail.com',
      method: 'POST',
      data: {
        _subject: 'New Posts',
        message: $message

      },
      dataType: 'json'

    }).done(function() {

      // Modal event
      var $modal = $('.modal-frame');
      var $overlay = $('.modal-overlay');

      /* Need this to clear out the keyframe classes so they dont
      clash with each other between ener/leave. Cheers. */

      $modal.bind('webkitAnimationEnd oanimationend msAnimationEnd animationend',
        function(e) {
          if ($modal.hasClass('state-leave')) {
            $modal.removeClass('state-leave');
          }
        });

      $('.close').on('click', function() {
        $overlay.removeClass('state-show');
        $modal.removeClass('state-appear').addClass('state-leave');
      });

      $('.open').on('click', function() {
        $overlay.addClass('state-show');
        $modal.removeClass('state-leave').addClass('state-appear');
      });
    });
  });
});
