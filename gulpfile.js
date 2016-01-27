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
  runSequence = require('run-sequence'),
  deploy = require('gulp-gh-pages'),
  sass = require('gulp-ruby-sass'),
  swig = require('swig'),
  swigExtras = require('swig-extras'),
  slugify = require('slug'),
  through = require('through2'),
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
  .pipe(gp.cssnano)
  .pipe(gp.sourcemaps.write('.'));

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
  'title': 'Serge Guilmettesite',
  'url': 'http://localhost:9000',
  'urlRoot': '/',
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

/* ==========================================================================
   TEMPLATE
   ========================================================================== */

gulp.task('testimonials', function() {
  return gulp.src('content/testimonials/*.md')
    .pipe(gp.frontMatter({
      property: 'page',
      remove: true
    }))
    .pipe(gp.marked())
    // Collect all the testimonials and place them on the site object.
    .pipe((function() {
      var testimonials = [];
      return gp.through.obj(function(file, enc, cb) {
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

gulp.task('cleanpages', function() {
  return gulp.src(['dist/*.html'], {read: false})
      .pipe(del());
});

gulp.task('pages', ['cleanpages', 'testimonials'], function() {
  var html = gulp.src(['content/pages/*.html'])
    .pipe(gp.frontMatter({
      property: 'page',
      remove: true
    }))
    .pipe(through.obj(function(file, enc, cb) {
      var data = {
        site: site,
        page: {}
      };
      var tpl = gp.swig.compileFile(file.path);
      file.contents = new Buffer(tpl(data), 'utf8');
      this.push(file);
      cb();
    }));

  var markdown = gulp.src('content/pages/*.md')
    .pipe(gp.frontMatter({
      property: 'page',
      remove: true
    }))
    .pipe(gp.marked())
    .pipe(applyTemplate('assets/templates/page.html'))
    .pipe(gp.rename({
      extname: '.html'
    }));

  return gp.merge(html, markdown)
    .pipe(gp.if(!DEBUG, gp.htmlmin({
      // This option seems logical, but it breaks gulp-rev-all
      removeAttributeQuotes: false,
      removeComments: true,
      collapseWhitespace: true,
      removeRedundantAttributes: true,
      removeStyleLinkTypeAttributes: true,
      minifyJS: true,
      minifyCSS: true,
      minifyURLs: true
    })))
    .pipe(gulp.dest('dist'))
    .pipe(gp.connect.reload());
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
