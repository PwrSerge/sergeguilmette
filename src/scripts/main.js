/**
 * Guilmette-design-site - GuilmetteDesign portfolio
 * @version v1.0.1
 * @link http://www.guilmettedesign.com
 * @license ISC
 */

/**
 * Browserify bundle modules
 */
var $ = require('jquery');
var Modernizr = require('browsernizr');

//require('svg4everybody');
var Snap = require('snapsvg')
require('./plugins.js')

// First lets create our drawing surface out of existing SVG element
// If you want to create new surface just provide dimensions
//like s = Snap(800, 600);
// var s = Snap("#svg");
// // Lets create big circle in the middle:
// var bigCircle = s.circle(150, 150, 100);
// // By default its black, lets change its attributes
// bigCircle.attr({
//   fill: "#bada55",
// });



/*
  Header  -- Slide menu
*/

$(function() {
    var $page = $('.inner-wrapper'),
        $navToggle = $('.nav-toggle'),
        $mainNavigation = $('.nav-main '),
        $header = $('.header-container'),
        $headerHt = $header.height(),
        $menuHt = $mainNavigation.height(),
        $totalmenuHt = $headerHt + $menuHt,
        $main = $('main'),
        $root = $('html, body');

    //fixed  header  on scroll
    // $(window).scroll(function() {
    //     if ($(this).scrollTop() > 1) {
    //         $header.addClass("header-container-fixed");
    //     } else {
    //         $header.removeClass("header-container-fixed");
    //     }



    //Toggle Slide Menu

    //remove transitions on window resize
    $(window).on('resize', function() {
        if (Modernizr.mq('(min-width:500px)')) {
            $mainNavigation.removeClass('nav-activated', 'open');
        }
    });

    //Click event for sliding menu
    $navToggle.on('click', function() {
        $page.toggleClass('open').addClass('nav-activated');
        $mainNavigation.toggleClass('open').addClass('nav-activated');
    });

    $page.on('click', function(e) {
        //$('.inner-wrapper').removeAttr('style');
        $mainNavigation.removeClass('open', 'nav-activated');
        $page.removeClass('open', 'nav-activated');
        e.preventDefault();
    });

    /**
     * Smooth scrolling when clicking anchor link
     *
     */

    $("a[href*=#]").click(function() {
        var href = $.attr(this, 'href');

        if ($(".nav-toggle").css("display") === "none") {
            $root.animate({
                scrollTop: $(href).offset().top - ($headerHt + 30)
            }, 600, function() {
                window.location.hash = href;
            });

        } else {
            $root.animate({
                scrollTop: $(href).offset().top - ($totalmenuHt + 138)
            }, 600, function() {
                window.location.hash = href;
            });
        }
        return false;
    });
});

