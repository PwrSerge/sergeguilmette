/**
 * SergeGuilmette-site
 * @version v1.0.0
 * @author serge guilmette http://www.sergeguilmette.me
 * @license ISC
 */

/**
 * Browserify bundle modules
 */

var Modernizr = require('modernizr');
var $ = require('jquery');
require('./plugins.js');
require('respond');

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
 *SVG fallback
 */

// if (!Modernizr.svg) {
//   console.log('not working');
//
// } else {
//   console.log(' working');
//   // Ajax for SVG sprite
//
//   $.get('/image/sprites/svg-symbols.svg', function(data) {
//     var div = document.createElement('div');
//     div.innerHTML = new XMLSerializer().serializeToString(data.documentElement);
//     document.body.insertBefore(div, document.body.childNodes[0]);
//   });
// }

// if (!Modernizr.svg) {
//     var imgs = document.getElementsByTagName('img');
//     var svgExtension = /.*\.svg$/
//     var l = imgs.length;
//     for(var i = 0; i < l; i++) {
//         if(imgs[i].src.match(svgExtension)) {
//             imgs[i].src = imgs[i].src.slice(0, -3) + 'png';
//             console.log(imgs[i].src);
//         }
//     }
// }

/*
 *  Header  -- Slide menu
 */

$(function() {

  var
    $page = $('.inner-wrapper'),
    $h2ht = $('h2').height(),
    $navToggle = $('.nav-toggle'),
    $mainNavigation = $('.nav-main'),
    $header = $('.header-container'),
    $headerHt = $header.outerHeight(),
    $menuHt = $mainNavigation.outerHeight(),
    $totalmenuHt = $headerHt + $menuHt,
    $dropdownHt = $headerHt - $menuHt,
    $main = $('main'),
    $root = $('html, body');

  $mainNavigation.addClass('is-close');
  //remove transitions on window load and resize
  //  $(window).on('load resize', function() {

  // $mainNavigation.offset({
  //   top: 0
  // });
  // $page.offset({
  //   top: 0
  // });

  //   if (Modernizr.mq('screen and (min-width: 700px)')) {
  //     $page.offset({
  //       top: 0
  //     });
  //     $mainNavigation.offset({
  //       top: 0
  //     });
  //   }
  // });

  //togle class for for sliding menu
  $navToggle.on('click', function() {
    $page.toggleClass('is-close');
    $mainNavigation.toggleClass('is-close');
  });

  $main.on('click', function() {
    $mainNavigation.removeClass('is-close');
    $page.removeClass('is-close');
  });

  //animate main menu on click event
  $navToggle.on('click', function(e) {
    e.preventDefault();
    if ($mainNavigation.hasClass('is-close')) {
      $mainNavigation.show();
      $mainNavigation.animate({
        top: $totalmenuHt
      }, 300);
      $page.animate({
        top: $headerHt
      }, 300);
    } else {
      $mainNavigation.animate({
        top: 0
      }, 300);
      $page.animate({
        top: $totalmenuHt
      }, 0);
    }
  });

  /**
   * Smooth scrolling when clicking anchor link
   */

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
