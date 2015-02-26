// Load plugins
var gulp = require('gulp'),
    source         = require('vinyl-source-stream'),
    browserify     = require('browserify'),
    buffer         = require('vinyl-buffer'),
    del = require('del'),
    stylish        = require('jshint-stylish'),
    browserSync    = require('browser-sync'),
    mainBowerFiles = require('main-bower-files'),
    styleguide     = require('sc5-styleguide'),
    gulpFilter     = require('gulp-filter'),
    runSequence    = require('run-sequence'),
    deploy = require('gulp-gh-pages'),
    sass           = require('gulp-ruby-sass'),
    gutil          = require('gulp-load-utils')(['colors', 'env', 'log', 'pipeline', 'lazypipe']),
    gp             = require('gulp-load-plugins')({
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
        dest: 'dist/scripts'
    },
    styles: {
        src: 'src/stylesheets/*.scss',
        dest: 'dist/css'
    },
    image: {
        src: ['src/image/*.png', 'src/image/*.jpg'],
        dest: 'dist/image'
    },
    html: {
        src: 'src/*.html',
        dest: 'dist/'
    }
};

/*
   fileinclude
   ========================================================================== */
var fileincludecfg = {
    prefix: '@@',
    basepath: '@file'
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
    ''
].join('\n');

/*
   lazypipe tasks using gulp-load-utils
   ========================================================================== */
var sassTasks = gutil.lazypipe()

     .pipe(gp.autoprefixer, 'last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4')
    .pipe(gp.cssbeautify, {
        indent: '  ',
        openbrace: 'end-of-line',
        autosemicolon: true
    });
    // .pipe(gp.uncss, ({
    //     html: ['src/index.html'],
    //     ignore: ['[class~="nav-"]', '[class~="inner-"]', '[class~="header-"]', '.inner-wrapper.open', '.nav-main.open', '.nav-main.nav-activated', '.inner-wrapper.nav-activated']
    // }));

var cssminTasks = gutil.lazypipe()
    .pipe(gp.rename, {
        //basename: 'main',
        suffix: '.min'
    })
    .pipe(gp.minifyCss);
        //.pipe(gp.sourcemaps,  'write()');

var jsminTasks = gutil.lazypipe()
    .pipe(gp.rename, {
        suffix: '.min'
    })
    .pipe(gp.uglify);
/*
   Sass config
   ========================================================================== */
var sassconfig = function sassconfig (Container) {
   return {
            //style: 'expanded',
            container: Container,
            sourcemap: true,
            trace: true,
            quiet: true,
            lineNumbers: false,
            compass: true,
            require: ['susy', 'modular-scale', 'breakpoint']
        }
    };
/*
   Notify config
   ========================================================================== */
  var notifycfg = function  (Title) {
   return {
     title:  (gutil.colors.cyan(Title)),
     message:'<%= file.relative %>'+' is done',
          };
};
/*
   SVG symbol config
   ========================================================================== */
var svgconfig = {
    id: 'icon-%f',
    className: '.icon-%f',
    fontSize: 16,
    templates:['default-svg'],
    svgoConfig: {
        removeViewBox: false,
        cleanupIDs: false
    }
};

/* ==========================================================================
   TEMPLATE
   ========================================================================== */

//Compile to HTML
// var swig = require('gulp-swig');

// gulp.task('templates', function() {
//   gulp.src('./lib/*.html')
//     .pipe(gp.swig())
//     .pipe(gulp.dest('./dist/'))
// });

// //Get data via JSON file, keyed on filename.
// var getJsonData = function(file) {
//   return require('./examples/' + path.basename(file.path) + '.json');
// };

// gulp.task('json-test', function() {
//   return gulp.src('./examples/test1.html')
//     .pipe(data(getJsonData))
//     .pipe(swig())
//     .pipe(gulp.dest('build'));
// });


/* ==========================================================================
   BOWER
   ========================================================================== */

// grab libraries files from bower_components and push in /src
gulp.task('bower', function() {
    var jsFilter = gulpFilter('*.js');
    var cssFilter = gulpFilter(['*.css', '*.scss']);
    var fontFilter = gulpFilter(['*.eot', '*.woff', '*.svg', '*.ttf']);

    return gulp.src(mainBowerFiles({
        debugging: true
    }))

    // grab vendor js files from bower_components and push in /src
    .pipe(jsFilter)
        .pipe(gulp.dest('src/scripts/vendor'))
        .pipe(jsFilter.restore())

    // grab vendor css files from bower_components and push in /src
    .pipe(cssFilter)
        .pipe(gulp.dest('src/stylesheets/vendor'))
        .pipe(cssFilter.restore())

    // grab vendor font files from bower_components and push in /src
    .pipe(fontFilter)
        .pipe(gp.flatten())
        .pipe(gulp.dest('src/fonts'))
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
        styleVariables:'src/stylesheets/components/_vars.scss',
        overviewPath: 'styleguide/sg-styleguide.md'
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
    return sass('src/stylesheets/main.scss', sassconfig('gulp-ruby-sass-site'))
        .pipe(gp.plumber())
        .pipe(sassTasks())
        .pipe(gp.rename('main.css'))
        .pipe(gulp.dest('./src/css/'))
        .pipe(cssminTasks())
        .pipe(gp.sourcemaps.write())
        .pipe(gulp.dest('./dist/css/'))
        .pipe(browserSync.reload({
        stream: true
        }))
        .pipe(gp.notify(notifycfg('STYLES')));
});

gulp.task('sass-print', function() {
    return sass('src/stylesheets/print.scss', sassconfig('gulp-ruby-sass-print'))
        .pipe(gp.plumber())
        .pipe(sassTasks())
        .pipe(gp.rename('print.css'))
        .pipe(gulp.dest('./src/css/'))
        .pipe(cssminTasks())
        .pipe(gp.sourcemaps.write())
        .pipe(gulp.dest('./dist/css/'))
        .pipe(browserSync.reload({
            stream: true
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
        debug: true
    });

    var bundle = function() {
        return bundler
            .bundle()
            .pipe(source(getBundleName() + '.js'))
            .pipe(buffer())
            .pipe(gp.sourcemaps.init({
                loadMaps: true
            }))
            // Add transformation tasks to the pipeline here.
           .pipe(gulp.dest('./src/scripts/'))
            .pipe(gp.uglify())
            .pipe(gp.sourcemaps.write('./'))
            .pipe(gulp.dest('./dist/scripts/'))
            .pipe(gp.notify(notifycfg('SCRIPTS')));
    };
    return bundle();
});

gulp.task('modernizr', function() {
gulp.src('./src/scripts/main.js')
  .pipe(gp.modernizr())
  .pipe(gulp.dest('./src/scripts/'));

});

// gulp.task('modernizr', function() {
//     return gulp.src('src/scripts/vendor/modernizr.js') // js that needs to be placed in the head
//         .pipe(jsminTasks())
//         .pipe(gulp.dest(paths.scripts.dest + '/vendor'))
//         .pipe(gp.notify(notifycfg('modernizr','modernizr task complete')));
// });

/* ==========================================================================
   IMAGES
   ========================================================================== */

gulp.task('image', ['sprites'], function() {
    return gulp.src(paths.image.src)
        .pipe(gp.changed(paths.image.dest))
        .pipe(gp.plumber())
        .pipe(gp.cache(gp.imagemin({
            optimizationLevel: 3,
            progressive: true,
            // use: [pngcrush()],
            interlaced: true
        })))
        .pipe(gp.size())
        .pipe(gulp.dest(paths.image.dest))
        .pipe(browserSync.reload({
            stream: true
        }))
        .pipe(gp.notify(notifycfg('IMAGES')));
});

/* ==========================================================================
   SVG SPRITES
   ========================================================================== */
gulp.task('sprites', function() {
    return gulp.src('src/image/icons/*.svg')
        .pipe(gp.plumber())
        .pipe(gp.svgSymbols(svgconfig))
        .pipe(gp.size())
        .pipe(gulp.dest('dist/image/sprites'))
        .pipe(gp.notify(notifycfg('IMAGES')));
});
/* ==========================================================================
   HTML
   ========================================================================== */
gulp.task('html', ['sass'], function() {
    return gulp.src('src/index.html')
        //.pipe(gp.changed(paths.html.src))
        .pipe(gp.plumber())
        .pipe(gp.fileInclude(fileincludecfg))
        //modernizr injection
        .pipe(gp.inject(gulp.src('./dist/scripts/vendor/modernizr*.min.js', {
            read: false
        }), {
            starttag: '<!-- inject:head:{{ext}} -->',
            ignorePath: 'dist/',
            addRootSlash: false
        }))
        // stylesheet and main javascripts injection
        .pipe(gp.inject(gulp.src(['./dist/css/*.min.css', './dist/scripts/*.min.js'], {
            read: false
        }), {
            ignorePath: ['src/', 'dist/'],
            addRootSlash: false
        }))
        .pipe(gp.size())
        .pipe(gulp.dest('./dist'))
        .pipe(browserSync.reload({
            stream: true
        }))
        .pipe(gp.notify({
            title: (gutil.colors.cyan.bold('HTML')),
            message: (gutil.colors.green.bold('HTML task complete'))
        }));

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
    '!dist/CNAME'
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
    browserSync.init(null, {
        server: {
            baseDir: './dist'
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

    // Watch image files
    gulp.watch('dist/image/**/*', ['image']);

    // Watch .html files
    gulp.watch('src/*.html', ['html']);
});

/* ==========================================================================
   DEPLOY
   ========================================================================== */
var options = {
    remoteUrl: "https://github.com/PwrSerge/serguilmette.github.io.git",
    branch: "gh-pages",
    cacheDir:"./publish"};

gulp.task('deploy', function () {
    return gulp.src('./dist/**/*')
                .pipe(deploy());
});

/* ==========================================================================
   BUILD TASK
   ========================================================================== */
gulp.task('build', function() {
    runSequence('clean', [ 'modernizr', 'scripts', 'image', 'html'],'deploy');
});
/* ==========================================================================
   DEFAULT TASK
   ========================================================================== */
gulp.task('default', function() {
    runSequence('scripts', 'image', 'html', 'watch');
});
