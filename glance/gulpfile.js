var gulp = require('gulp');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var minifyCss = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var RevAll = require('gulp-rev-all');
var rename = require('gulp-rename');
var htmlmin = require('gulp-htmlmin');
var useref = require('gulp-useref');
var clean = require('gulp-clean');
var gulpif = require('gulp-if');
var rev = require('gulp-rev-hash');
var jslint = require('gulp-jslint-simple');

var angularTemplatecache = require('gulp-angular-templatecache');
var minifyHtml = require('gulp-minify-html');
var inject = require('gulp-inject');
var ngAnnotate = require('gulp-ng-annotate');

gulp.task('copy-confdev', function() {
    gulp.src('js/confdev.js')
        .pipe(gulp.dest('build/js/'));
});

gulp.task('copy-pics', ['copy-confdev'], function() {
    gulp.src('pics/*')
        .pipe(gulp.dest('build/pics/'));
});

gulp.task('copy-fonts', ['copy-pics'], function() {
    var sources = ['bower_components/bootstrap/dist/fonts/*', 'bower_components/font-awesome/fonts/*'];
    gulp.src(sources)
        .pipe(gulp.dest('build/fonts'));
});

gulp.task('copy-swf', ['copy-fonts'], function() {
    var sources = ['bower_components/zeroclipboard/dist/ZeroClipboard.swf'];
    return gulp.src(sources)
        .pipe(gulp.dest('build/js'));
});


//utils html to js
gulp.task('template-min-utils', function () {
    return gulp.src('glance/utils/**/*.html')
        .pipe(minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe(angularTemplatecache('templateCacheHtmlUtils.js', {
            module: 'glance.utils',
            root: '/glance/utils'
        }))
        .pipe(gulp.dest('build/js/'));
});

gulp.task('template-min-user', ['template-min-utils'], function () {
    return gulp.src('glance/user/**/*.html')
        .pipe(minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe(angularTemplatecache('templateCacheHtmlUser.js', {
            module: 'glance.user',
            root: '/glance/user'
        }))
        .pipe(gulp.dest('build/js/'));
});

//application html to js
gulp.task('template-min-app', ['template-min-user'], function () {
    return gulp.src('glance/application/**/*.html')
        .pipe(minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe(angularTemplatecache('templateCacheHtmlApp.js', {
            module: 'glance.app',
            root: '/glance/application'
        }))
        .pipe(gulp.dest('build/js/'));
});

//image html to js
gulp.task('template-min-image', ['template-min-app'], function () {
    return gulp.src('glance/image/**/*.html')
        .pipe(minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe(angularTemplatecache('templateCacheHtmlImage.js', {
            module: 'glance.image',
            root: '/glance/image'
        }))
        .pipe(gulp.dest('build/js/'));
});
// views html to js
gulp.task('template-min', ['template-min-image'], function () {
    return gulp.src('views/**/*.html')
        .pipe(minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe(angularTemplatecache('templateCacheHtml.js', {
            module: 'glance',
            root: '/views'
        }))
        .pipe(gulp.dest('build/js/'));
});

gulp.task('ng-annotate', ['template-min'], function(){
    return gulp.src('glance/**/*.js')
        .pipe(ngAnnotate({add: true}))
        .pipe(gulp.dest('build/glance/'))
})

gulp.task('html-replace', ['ng-annotate'], function() {

    var templateInjectFile = gulp.src('build/js/templateCacheHtml*.js', { read: false });
    var templateInjectOptions = {
        starttag: '<!-- inject:template.js  -->',
        addRootSlash: false
    };

    var assets = useref.assets();
    var revAll = new RevAll();
    return gulp.src('index.html')
        .pipe(inject(templateInjectFile, templateInjectOptions))
        .pipe(assets)
        .pipe(gulpif('*.js', uglify()))
        .pipe(gulpif('*.css', minifyCss()))
        .pipe(assets.restore())
        .pipe(useref().on('error', gutil.log))
        .pipe(revAll.revision().on('error', gutil.log))
        .pipe(gulp.dest('build/'))
        .pipe(revAll.manifestFile())
        .pipe(gulp.dest('build/'));
});

gulp.task('html-rename', ['html-replace'], function() {
    gulp.src('build/index.*.html')
      .pipe(rename('index.html').on('error', gutil.log))
      .pipe(gulp.dest('build/'));
});

gulp.task('clean', ['html-rename'], function() {
    var sources = [
      'build/index.**.html',
      'build/js/templateCacheHtml*.js',
      'build/glance'
    ];
    return gulp.src(sources, {read: false})
        .pipe(clean());
});

gulp.task('rev', function() {
    gulp.src('build/index.html')
        .pipe(rev())
        .pipe(gulp.dest('build/'));
});

gulp.task('default', ['clean', 'copy-swf']);

gulp.task('lint', function () {
  gulp.src('./js/*.js')
  .pipe(jslint.run({
    node: true,
    vars: true
  }))
  .pipe(jslint.report({
     reporter: require('jshint-stylish').reporter
  }));
});
