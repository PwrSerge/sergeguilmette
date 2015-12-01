// Load plugins
var gulp = require('gulp'),
  source = require('vinyl-source-stream'),
  browserify = require('browserify'),
  buffer = require('vinyl-buffer'),
  del = require('del'),
  stylish = require('jshint-stylish'),
  browserSync = require('browser-sync'),
  mainBowerFiles = require('main-bower-files'),
  styleguide = require('sc5-styleguide'),
  gulpFilter = require('gulp-filter'),
  runSequence = require('run-sequence'),
  deploy = require('gulp-gh-pages'),
  sass = require('gulp-ruby-sass'),
  path = require('path'),
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
  image: {
    src: ['src/image/**/*.png', 'src/image/**/*.jpg'],
    dest: 'dist/image',
  },
  html: {
    src: 'src/*.html',
    dest: 'dist/',
  },
};

/*
   Fileinclude
   ========================================================================== */
var fileincludecfg = {
  prefix: '@@',
  basepath: '@file',
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
  .pipe(gp.minifyCss);

//.pipe(gp.sourcemaps,  'write()');

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

//Compile to HTML
// var swig = require('gulp-swig');

// Gulp.task('templates', function() {
//   gulp.src('./lib/*.html')
//     .pipe(gp.swig())
//     .pipe(gulp.dest('./dist/'))
// });

// //Get data via JSON file, keyed on filename.
// var getJsonData = function(file) {
//   return require('./examples/' + path.basename(file.path) + '.json');
// };

// Gulp.task('json-test', function() {
//   return gulp.src('./examples/test1.html')
//     .pipe(data(getJsonData))
//     .pipe(swig())
//     .pipe(gulp.dest('build'));
// });

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

gulp.task('image', ['sprite'], function() {
  return gulp.src(paths.image.src)
    .pipe(gp.changed(paths.image.dest))
    .pipe(gp.plumber())
    .pipe(gp.cache(gp.imagemin({
      optimizationLevel: 3,
      progressive: true,

      // Use: [pngcrush()],
      interlaced: true,
    })))
    .pipe(gp.size())
    .pipe(gulp.dest(paths.image.dest))
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
    .src('src/image/icons/*.svg', {
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
        $('svg').attr('display','none');
      },
      parserOptions: {
        xmlMode: true
      }
    }))
    .pipe(gp.size())
    .pipe(gulp.dest('dist/image/sprites'))
    .pipe(gp.notify(notifycfg('IMAGES')));
});

gulp.task('svgfallback', function() {
  return gulp
    .src('src/image/icons/*.svg', {
      base: 'src/svg' + '-symbols'
    })
    .pipe(gp.rename({
      prefix: 'icon-'
    }))
    .pipe(gp.svgfallback({
      backgroundUrl: '/image/sprites/svg-symbols.png'
    }))
    .pipe(gp.if(/[.]css$/, gp.cssScss()))
    .pipe(gp.if(/[.]scss$/, gulp.dest('src/stylesheets/components')))
    .pipe(gp.if(/[.]png$/, gulp.dest('src/image/sprites')));
});

/* ==========================================================================
   HTML
   ========================================================================== */

gulp.task('html', ['sass'], function() {

  return gulp.src('src/*.html')
    .pipe(gp.changed(paths.html.src))
    .pipe(gp.plumber())
    .pipe(gp.fileInclude(fileincludecfg))

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
    .pipe(gp.inject(gulp.src(['./dist/image/sprites/*.svg']), {
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
    'dist/image/**',
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
gulp.task('browser-sync', function() {
  browserSync({
    server: {
      baseDir: './dist',
    },
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

  // Watch image files
  gulp.watch('src/image/**/*', ['image']);

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
  runSequence('clean', ['modernizr', 'scripts', 'image', 'html'], 'deploy');
});
/* ==========================================================================
   DEFAULT TASK
   ========================================================================== */
gulp.task('default', function() {
  runSequence('scripts', 'image', 'html', 'watch');
});
