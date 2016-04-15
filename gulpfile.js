// Load plugins
var _ = require('underscore'),
  argv = require('yargs').argv,
  gulp = require('gulp'),
  source = require('vinyl-source-stream'),
  browserify = require('browserify'),
  buffer = require('vinyl-buffer'),
  del = require('del'),
  stylish = require('jshint-stylish'),
  browserSync = require('browser-sync'),
  marked = require('gulp-marked'),
  merge = require('merge-stream'),
  mainBowerFiles = require('main-bower-files'),
  styleguide = require('sc5-styleguide'),
  gulpFilter = require('gulp-filter'),
  htmlmin = require('htmlmin'),
  runSequence = require('run-sequence'),
  deploy = require('gulp-gh-pages'),
  sass = require('gulp-ruby-sass'),
  swig = require('swig'),
  swigExtras = require('swig-extras'),
  slugify = require('slug'),
  through = require('through2'),
  path = require('path'),
  realfavicon = require('gulp-real-favicon'),
  fs = require('fs'),
  gutil = require('gulp-load-utils')(['colors',
    'env', 'log', 'pipeline', 'lazypipe'
  ]),
  gp = require('gulp-load-plugins')({
    pattern: ['gulp-*', 'gulp.*'],
    replaceString: /\bgulp[\-.]/
  });

/* ==========================================================================
   CONFIGS
   ========================================================================== */

/*
   Paths
   ========================================================================== */

var paths = {
  scr: 'src',
  dest: 'dist',
  scripts: {
    src: 'src/scripts/**/*.js',
    dest: 'dist/scripts',
  },
  styles: {
    src: 'src/stylesheets/*.scss',
    dest: 'dist/css',
  },
  images: {
    src: ['src/images/**/*.png', 'src/images/**/*.jpg'],
    dest: 'dist/images',
  },
  html: {
    src: 'src/*.html',
    dest: 'dist/',
  },
};

/*
   Baner
   ========================================================================== */
var packg = require('./package.json');
var banner = ['/**',
  ' * <%= packg.name %> - <%= packg.description %>',
  ' * @version v<%= packg.version %>',
  ' * @link <%= packg.homepage %>',
  ' * @license <%= packg.license %>',
  ' */',
  '',
].join('\n');

/*
   Lazypipe tasks using gulp-load-utils
   ========================================================================== */
var sassTasks = gutil.lazypipe()

.pipe(gp.autoprefixer, 'last 2 version', 'safari 5', 'ie 8', 'ie 9',
    'opera 12.1', 'ios 6', 'android 4')
  .pipe(gp.cssbeautify, {
    indent: '  ',
    openbrace: 'end-of-line',
    autosemicolon: true,
  });

// .pipe(gp.uncss, ({
//     html: ['src/index.html'],
//     ignore: ['[class~="nav-"]', '[class~="inner-"]', '[class~="header-"]', '.inner-wrapper.open', '.nav-main.open', '.nav-main.nav-activated', '.inner-wrapper.nav-activated']
// }));

var cssminTasks = gutil.lazypipe()
  .pipe(gp.rename, {
    //Basename: 'main',
    suffix: '.min',
  })
  .pipe(gp.cssnano);
//.pipe(gp.sourcemaps.write, '.');

var jsminTasks = gutil.lazypipe()
  .pipe(gp.rename, {
    suffix: '.min',
  })
  .pipe(gp.uglify);
/*
   Sass config
   ========================================================================== */
var sassconfig = function sassconfig() {
  return {
    //Style: 'expanded',
    //sourcemap: true,
    trace: true,
    quiet: true,
    lineNumbers: false,
    compass: true,
    require: ['susy', 'modular-scale', 'breakpoint'],
  };
};
/*
   Notify config
   ========================================================================== */
var notifycfg = function(Title) {
  return {
    title: Title,
    message: '<%= file.relative %>' + ' is done',
  };
};
/*
   SVG symbol config
   ========================================================================== */
var svgconfig = {
  id: 'icon-%f',
  className: '.icon-%f',
  fontSize: 16,
  templates: ['default-svg'],
};

/* ==========================================================================
   TEMPLATE
   ========================================================================== */
/**
 * Debug mode may be set in one of these manners:
 * - gulp --debug=[true | false]
 * - export NODE_DEBUG=[true | false]
 */
var DEBUG,
  USER_DEBUG = (argv.debug || process.env.NODE_DEBUG);
if (USER_DEBUG === undefined && argv._.indexOf('deploy') > -1) {
  DEBUG = false;
} else {
  DEBUG = USER_DEBUG !== 'false';
}

var site = {
  'title': 'Serge Guilmette',
  'url': 'http://localhost:9000',
  'urlRoot': './',
  'author': 'Serge Guilmette',
  'email': 'sergeguilmette@gmail.com',
  'time': new Date()
};

if (argv._.indexOf('deploy') > -1) {
  site.url = 'https://github.com/PwrSerge/sergeguilmette';
  site.urlRoot = '/sergeguilmette/';
}
swig.setDefaults({
  loader: swig.loaders.fs(__dirname + '/src/templates'),
  cache: false
});
swigExtras.useFilter(swig, 'truncate');
swig.setFilter('slugify', slugify);

function summarize(marker) {
  return through.obj(function(file, enc, cb) {
    var summary = file.contents.toString().split(marker)[0];
    file.page.summary = summary;
    this.push(file);
    cb();
  });
}

function applyTemplate(templateFile) {
  var tpl = swig.compileFile(path.join(__dirname, templateFile));

  return through.obj(function(file, enc, cb) {
    var data = {
      site: site,
      page: file.page,
      content: file.contents.toString()
    };
    file.contents = new Buffer(tpl(data), 'utf8');
    this.push(file);
    cb();
  });
}

gulp.task('cleanposts', function(cb) {
  del('dist/posts/', cb);
});

gulp.task('posts', ['cleanposts'], function() {
  // Copy blog images over.
  var images = gulp.src(['images/posts/*.jpg', 'images/posts/*.png'])
    .pipe(gulp.dest('dist/images/posts'));

  var posts = gulp.src('content/posts/*.md')
    .pipe(gp.frontMatter({
      property: 'page',
      remove: true
    }))
    .pipe(marked())
    .pipe(summarize('<!--more-->'))
    // Collect all the posts and place them on the site object.
    .pipe((function() {
      var posts = [];
      var tags = [];
      return through.obj(function(file, enc, cb) {
          file.page.url = 'posts/' + path.basename(file.path, '.md');
          posts.push(file.page);
          posts[posts.length - 1].content = file.contents.toString();

          if (file.page.tags) {
            file.page.tags.forEach(function(tag) {
              if (tags.indexOf(tag) === -1) {
                tags.push(tag);
              }
            });
          }

          this.push(file);
          cb();
        },
        function(cb) {
          posts.sort(function(a, b) {
            return b.date - a.date;
          });
          site.posts = posts;
          site.tags = tags;
          cb();
        });
    })())
    .pipe(applyTemplate('assets/templates/post.html'))
    .pipe(gulp.dest('dist/posts'))
    .pipe(browserSync.reload({
      stream: true,
    }));

  return merge(images, posts)
    .pipe(browserSync.reload({
      stream: true,
    }));
});

gulp.task('testimonials', function() {
  return gulp.src('src/content/testimonials/*.md')
    .pipe(gp.frontMatter({
      property: 'page',
      remove: true
    }))
    .pipe(marked())
    // Collect all the testimonials and place them on the site object.
    .pipe((function() {
      var testimonials = [];
      return through.obj(function(file, enc, cb) {
          testimonials.push(file.page);
          testimonials[testimonials.length - 1].content = file.contents.toString();
          this.push(file);
          cb();
        },
        function(cb) {
          testimonials.sort(function(a, b) {
            if (a.author < b.author) {
              return -1;
            }
            if (a.author > b.author) {
              return 1;
            }
            return 0;
          });
          site.testimonials = testimonials;
          cb();
        });
    })());
});

gulp.task('cleanpages', function(cb) {
  del('dist/*.html', cb);
});

gulp.task('pages', function() {
  var html = gulp.src(['src/content/pages/*.html'])
    .pipe(gp.frontMatter({
      property: 'page',
      remove: true
    }))
    .pipe(through.obj(function(file, enc, cb) {
      var data = {
        site: site,
        page: {}
      };
      var tpl = swig.compileFile(file.path);
      file.contents = new Buffer(tpl(data), 'utf8');
      this.push(file);
      cb();
    }));

  var markdown = gulp.src('src/content/pages/*.md')
    .pipe(gp.frontMatter({
      property: 'page',
      remove: true
    }))
    .pipe(marked())
    .pipe(applyTemplate('src/templates/page.html'))
    .pipe(gp.rename({
      extname: '.html'
    }));

  return merge(html, markdown)
    // .pipe(gp.if(!DEBUG, htmlmin({
    //   // This option seems logical, but it breaks gulp-rev-all
    //   removeAttributeQuotes: false,
    //   removeComments: true,
    //   collapseWhitespace: true,
    //   removeRedundantAttributes: true,
    //   removeStyleLinkTypeAttributes: true,
    //   minifyJS: true,
    //   minifyCSS: true,
    //   minifyURLs: true
    // })))
    .pipe(gulp.dest('./dist/'))
    .pipe(browserSync.reload({
      stream: true,
    }))
    .pipe(gp.notify(notifycfg('PAGES')));
});

/* ==========================================================================
   BOWER
   ========================================================================== */

// Grab libraries files from bower_components and push in /src
gulp.task('bower', function() {
  var jsFilter = gulpFilter('*.js');
  var cssFilter = gulpFilter(['*.css', '*.scss']);
  var fontFilter = gulpFilter(['*.eot', '*.woff', '*.svg', '*.ttf']);

  return gulp.src(mainBowerFiles({
    debugging: true,
  }))

  // Grab vendor js files from bower_components and push in /src
  .pipe(jsFilter)
    .pipe(gulp.dest('src/scripts/vendor'))
    .pipe(jsFilter.restore())

  // Grab vendor css files from bower_components and push in /src
  .pipe(cssFilter)
    .pipe(gulp.dest('src/stylesheets/vendor'))
    .pipe(cssFilter.restore())

  // Grab vendor font files from bower_components and push in /src
  .pipe(fontFilter)
    .pipe(gp.flatten())
    .pipe(gulp.dest('src/fonts'));
});

/* ==========================================================================
   STYLGUIDE based on KSS
   ========================================================================== */
var outputPath = 'styleguide';

gulp.task('styleguide:generate', function() {
  return gulp.src('src/stylesheets/components/*.scss')
    .pipe(styleguide.generate({
      title: 'My Styleguide',
      server: true,
      rootPath: outputPath,
      styleVariables: 'src/stylesheets/components/vars.scss',
      overviewPath: 'styleguide/sg-styleguide.md',
    }))
    .pipe(gulp.dest(outputPath));
});

gulp.task('styleguide:applystyles', function() {
  return gulp.src('src/css/main.css')
    .pipe(styleguide.applyStyles())
    .pipe(gulp.dest(outputPath));
});

gulp.task('styleguide', ['styleguide:generate', 'styleguide:applystyles']);

/* ==========================================================================
   STYLES
   ========================================================================== */
gulp.task('sass-site', function() {
  return sass('src/stylesheets/main.scss', sassconfig())
    .pipe(gp.changed(paths.styles.dest))
    .pipe(gp.plumber())
    .pipe(sassTasks())
    .pipe(gp.rename('main.css'))
    .pipe(gulp.dest('./src/css/'))
    .pipe(cssminTasks())
    .pipe(gp.sourcemaps.write())
    .pipe(gulp.dest('./dist/css/'))
    .pipe(browserSync.reload({
      stream: true,
    }))
    .pipe(gp.notify(notifycfg('STYLES')));
});

gulp.task('sass-print', function() {
  return sass('src/stylesheets/print.scss', sassconfig())
    .pipe(gp.changed(paths.styles.dest))
    .pipe(gp.plumber())
    .pipe(sassTasks())
    .pipe(gp.rename('print.css'))
    .pipe(gulp.dest('./src/css/'))
    .pipe(cssminTasks())
    .pipe(gp.sourcemaps.write())
    .pipe(gulp.dest('./dist/css/'))
    .pipe(browserSync.reload({
      stream: true,
    }))
    .pipe(gp.notify(notifycfg('STYLES')));
});

gulp.task('sass', ['sass-site', 'sass-print']);

/* ==========================================================================
   SCRIPTS
   ========================================================================== */
var getBundleName = function() {
  var name = require('./package.json').name;
  return name + '.' + 'min';
};

gulp.task('scripts', function() {
  var bundler = browserify({
    entries: ['./src/scripts/main.js'],
    debug: true,
  });

  var bundle = function() {
    return bundler
      .bundle()
      .pipe(source(getBundleName() + '.js'))
      .pipe(buffer())
      // .pipe(gp.sourcemaps.init({
      //   loadMaps: true,
      // }))

    // Add transformation tasks to the pipeline here.
    .pipe(gulp.dest('./src/scripts/'))
      .pipe(gp.uglify())
      .pipe(gp.sourcemaps.write('./'))
      .pipe(gulp.dest('./dist/scripts/'))
      .pipe(browserSync.reload({
        stream: true,
      }))
      .pipe(gp.notify(notifycfg('SCRIPTS')));
  };

  return bundle();
});

gulp.task('custom-modernizr', function() {
  return gulp.src('bower_components/modernizr/modernizr.js')
    .pipe(gp.modulizr([
      'cssclasses',
      'svg',
      'inlinesvg',
      'fontface',
      'csstransitions'
    ]))
    .pipe(gp.concat('custom-modernizr.js'))
    .pipe(gulp.dest('./src/scripts/'));
});

/* ==========================================================================
IMAGES
========================================================================== */

gulp.task('images', ['sprite'], function() {
  return gulp.src(paths.images.src)
    .pipe(gp.changed(paths.images.dest))
    .pipe(gp.plumber())
    .pipe(gp.cache(gp.imagemin({
      optimizationLevel: 3,
      progressive: true,

      // Use: [pngcrush()],
      interlaced: true,
    })))
    .pipe(gp.size())
    .pipe(gulp.dest(paths.images.dest))
    .pipe(browserSync.reload({
      stream: true,
    }))
    .pipe(gp.notify(notifycfg('IMAGES')));
});

/* ==========================================================================
   SVG SPRITES
   ========================================================================== */
gulp.task('sprite', ['svgfallback'], function() {

  return gulp
    .src('src/images/icons/*.svg', {
      base: 'src/svg' + '-symbols'
    })
    .pipe(gp.rename({
      prefix: 'icon-'
    }))
    .pipe(gp.svgmin({
      js2svg: {
        pretty: true
      }
    }))
    .pipe(gp.svgstore({
      inlineSvg: true
    }))
    .pipe(gp.cheerio({
      run: function($) {
        $('[fill]').removeAttr('fill');
        $('svg').attr('display', 'none');
      },
      parserOptions: {
        xmlMode: true
      }
    }))
    .pipe(gp.size())
    .pipe(gulp.dest('dist/images/sprites'))
    .pipe(gp.notify(notifycfg('IMAGES')));
});

gulp.task('svgfallback', function() {
  return gulp
    .src('src/images/icons/*.svg', {
      base: 'src/svg' + '-symbols'
    })
    .pipe(gp.rename({
      prefix: 'icon-'
    }))
    .pipe(gp.svgfallback({
      backgroundUrl: '/images/sprites/svg-symbols.png'
    }))
    .pipe(gp.if(/[.]css$/, gp.cssScss()))
    .pipe(gp.if(/[.]scss$/, gulp.dest('src/stylesheets/components')))
    .pipe(gp.if(/[.]png$/, gulp.dest('src/images/sprites')));
});

/* ==========================================================================
   FAVICONS
   ========================================================================== */

var realfavicon = require('gulp-real-favicon');
var fs = require('fs');

// File where the favicon markups are stored
var FAVICON_DATA_FILE = 'faviconData.json';

// Generate the icons. This task takes a few seconds to complete.
// You should run it at least once to create the icons. Then,
// you should run it whenever RealFaviconGenerator updates its
// package (see the check-for-favicon-update task below).
gulp.task('generate-favicon', function(done) {
  realfavicon.generateFavicon({
    masterPicture: 'src/images/icons/GD-logo2.svg',
    dest: 'dist/images/favicon/',
    iconsPath: '{{site.urlRoot}}images/favicon/',
    design: {
      ios: {
        pictureAspect: 'backgroundAndMargin',
        backgroundColor: '#ffffff',
        margin: '14%'
      },
      desktopBrowser: {},
      windows: {
        pictureAspect: 'noChange',
        backgroundColor: '#da532c',
        onConflict: 'override'
      },
      androidChrome: {
        pictureAspect: 'backgroundAndMargin',
        margin: '6%',
        backgroundColor: '#ffffff',
        themeColor: '#ffffff',
        manifest: {
          name: 'Guilmette Design',
          display: 'browser',
          orientation: 'notSet',
          onConflict: 'override',
          declared: true
        }
      },
      safariPinnedTab: {
        pictureAspect: 'silhouette',
        themeColor: '#5bbad5'
      }
    },
    settings: {
      scalingAlgorithm: 'Mitchell',
      errorOnImageTooSmall: false
    },
    markupFile: FAVICON_DATA_FILE
  }, function() {
    done();
  });
});

// Inject the favicon markups in your HTML pages. You should run
// this task whenever you modify a page. You can keep this task
// as is or refactor your existing HTML pipeline.
gulp.task('inject-favicon-markups', function() {
  gulp.src(['src/templates/base.html'])
    .pipe(realfavicon.injectFaviconMarkups(JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).favicon.html_code))
    .pipe(gulp.dest('./src/templates/'));

});

// Check for updates on RealFaviconGenerator (think: Apple has just
// released a new Touch icon along with the latest version of iOS).
// Run this task from time to time. Ideally, make it part of your
// continuous integration system.
gulp.task('check-for-favicon-update', function(done) {
  var currentVersion = JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).version;
  realfavicon.checkForUpdates(currentVersion, function(err) {
    if (err) {
      throw err;
    }
  });
});

/* ==========================================================================
   HTML
   ========================================================================== */

gulp.task('html', ['sass'], function() {

  return gulp.src('src/*.html')
    .pipe(gp.changed(paths.html.src))
    .pipe(gp.plumber())

  // Stylesheet and main javascripts injection
  .pipe(gp.inject(gulp.src(['./dist/css/*.min.css',
      './dist/scripts/*.min.js'
    ], {
      read: false
    }), {
      ignorePath: ['src/', 'dist/'],
      addRootSlash: false,
    }))
    // inline svg injection
    .pipe(gp.inject(gulp.src(['./dist/images/sprites/*.svg']), {
      starttag: '<!-- inject:head:{{ext}} -->',
      transform: function(filePath, file) {
        return file.contents.toString();
      }
    }))
    .pipe(gp.prettify({
      // indent_size: 2
    }))
    .pipe(gp.size())
    .pipe(gulp.dest('./dist'))
    .pipe(browserSync.reload({
      stream: true,
    }))
    .pipe(gp.notify(notifycfg('HTML')));

});
/* ==========================================================================
   CLEAN
   ========================================================================== */
gulp.task('clean', function(cb) {
  del([
    'dist/css/**',
    'dist/images/**',
    'dist/scripts/**',
    'dist/index.html',
    '!dist/CNAME',
  ], cb);
});

/* ==========================================================================
   BUMP VERSION
   ========================================================================== */
gulp.task('bump', function() {
  return gulp.src(['./package.json', './bower.json'])
    .pipe(gp.bump())
    .pipe(gulp.dest('./'));
});
/* ==========================================================================
   BROWSER_SYNC
   ========================================================================== */
// Configure the proxy server for livereload
var proxyServer = 'http://localhost',
  port = 8000;

// Array of files to watch
var arrAddFiles = [
  './app/**/*.php'
];

// browser-sync task for starting the server.
gulp.task('browser-sync', function() {
  browserSync({
    server: {
      baseDir: './dist/' // Change this to your web root dir
    },
    //proxy: proxyServer,
    port: port,
    //files: arrAddFiles,
    ghostMode: {
      clicks: true,
      location: true,
      forms: true,
      scroll: true
    }
  });
});
/* ==========================================================================
   WATCH
   ========================================================================== */
gulp.task('watch', ['browser-sync'], function() {
  // //opens the index page in default browser
  // gulp.start('url');

  // Watch .scss files
  gulp.watch('src/stylesheets/**/*.scss', ['sass']);

  // Watch .js files
  gulp.watch('src/scripts/**/*.js', ['scripts']);

  // Watch images files
  gulp.watch('src/images/**/*', ['images']);

  // Watch .html files
  gulp.watch('src/*.html', ['html']);
});

/* ==========================================================================
   DEPLOY
   ========================================================================== */
var options = {
  remoteUrl: 'https://github.com/PwrSerge/serguilmette.github.io.git',
  branch: 'gh-pages',
  cacheDir: './publish',
};

gulp.task('deploy', function() {
  return gulp.src('./dist/**/*')
    .pipe(deploy());
});

/* ==========================================================================
   BUILD TASK
   ========================================================================== */
gulp.task('build', function() {
  runSequence('clean', ['modernizr', 'scripts', 'images', 'html'], 'deploy');
});
/* ==========================================================================
   DEFAULT TASK
   ========================================================================== */
gulp.task('default', function() {
  runSequence('scripts', 'images', 'html', 'watch');
});
