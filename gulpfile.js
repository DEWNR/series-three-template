'use strict';

var argv = require('yargs').argv,   // Pass agruments using the command line
    autoprefixer = require('gulp-autoprefixer'),    // Add vendor prefixes to CSS
    autoprefixerOptions,
    browserSync = require('browser-sync').create(),     // Automatically refresh the browser
    concat = require('gulp-concat'),    // Combine simple JavaScript files
    del = require('del'),   // Delete unwanted files and folders (eg public before production build)
    fingerprint = require('gulp-fingerprint'),  // Update asset paths to include fingerprint. Used in conjuction with gulp-rev
    fingerprintOptions,
    fs = require('fs'), // File system; used to check if files exist
    jsonfile = require('jsonfile'), // Read JSON data
    gulp = require('gulp'),
    htmlmin = require('gulp-html-minifier'),
    htmlminOptions,
    imagemin = require('gulp-imagemin'),    // Optimise images
    imageminOptions,
    jsList,   // List of JavaScripts to combine
    minifyCss = require('gulp-minify-css'),     // Minify CSS
    minifyCssOptions,
    mustache = require('gulp-mustache-plus'),
    mustacheData,
    mustachePartials,
    passthrough = require('gulp-empty'),    // Pass through an unaltered stream; useful for conditional processing
    paths,  // Frequently used file paths
    rename = require('gulp-rename'), // Rename output files
    rev = require('gulp-rev'),      // Add a hash-based fingerprint to the output filename
    revManifestOptions,
    runSequence = require('run-sequence'),   // Run tasks in specific order. Not required in Gulp v4
    sass = require('gulp-sass'),    // Compile CSS from Sass/sass
    sassOptions,
    uglify = require('gulp-uglify');    // Mangle and compress JavaScript


// Set the commonly used folder paths

(function () {

    // Set the variables for the root folders

    var dest = argv.production ? "public/" : "temp/",    // Use the public folder for a "production" build or the temp folder for all other builds
        src = "./";


    // Set paths as an object

    paths = {};


    // Set the destination path

    paths.dest = dest;


    // Set the manifest path for gulp-rev and gulp-fingerprint

    paths.manifest = dest + "rev-manifest.json";


    // Set the source paths

    paths.src = {};

    paths.src.root = src;

    paths.src.html = src + "html/";

    paths.src.images = src + "images/";

    paths.src.js = src + "js/";

    paths.src.sass = src + "sass/"

}());


// Set options

autoprefixerOptions = {
    browsers: [
        "Android 2.3",
        "Android >= 4",
        "Chrome >= 20",
        "Firefox >= 24",
        "Explorer >= 8",
        "iOS >= 6",
        "Opera >= 12",
        "Safari >= 6"
    ]
};


fingerprintOptions = {};


htmlminOptions = {
    removeComments: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    minifyJS: true,
    minifyCSS: true
};


imageminOptions = {
    multipass: true,
    progressive: true,
    svgoPlugins: [
        {removeViewBox: false}
    ]
};


minifyCssOptions = {
    compatibility: 'ie7,' +
        '-units.ch,' +
        '-units.in,' +
        '-units.pc,' +
        '-units.pt,' +
        '-units.rem,' +
        '-units.vh,' +
        '-units.vm,' +
        '-units.vmax,' +
        '-units.vmin'
};


mustacheData = {
    categories: [
        {title: 'Category 1', url: '/category-1'},
        {title: 'Category 2', url: '/category-2'},
        {title: 'Category 3', url: '/category-3'},
        {title: 'Category 4', url: '/category-4'}
    ],
    menuItems: [
        {title: 'Menu Item 1', url: '/menu-item-1'},
        {title: 'Menu Item 2', url: '/menu-item-2'},
        {title: 'Menu Item 3', url: '/menu-item-3'},
        {title: 'Menu Item 4', url: '/menu-item-4'},
        {title: 'Menu Item 5', url: '/menu-item-5'}
    ]
};

mustachePartials = {
    categoryList: paths.src.html + 'mustache/category-list.mustache',
    menuItemList: paths.src.html + 'mustache/menu-item-list.mustache'
};


revManifestOptions = {
    base: paths.dest,  // Necessary to allow merging;
    merge: true
};


sassOptions = {
    includePaths: ['./node_modules']
};





// Define JavaScript bundles

/**
 * Use an array of objects with the following properties:
 *
 *      source - an array of source files
 *      destination - the output folder
 *      filename - the output filename
 *
 * For example:
 *
 *  jsList = [
 *      {
 *          source: [
 *              paths.src.includes + "fancybox/source/jquery.fancybox.js",
 *              paths.src.includes + "fancybox/source/helpers/jquery.fancybox-thumbs.js"
 *          ],
 *          destination: paths.dest.js,
 *          filename: "fancybox.custom.js"
 *      }
 *  ];
 **/

jsList = [
    {
        source: [
            paths.src.js + "ui-toggle.js",
            paths.src.js + "sticky-navigation.js"
        ],
        filename: "main.js"
    }
];





// Redefine some optimisation processes so they're not used in development

if (!argv.production) {
    fingerprint = passthrough;
    htmlmin = passthrough;
    minifyCss = passthrough;
    rev = passthrough;
    rev.manifest = passthrough;
    uglify = passthrough;
}





// Remove destination folder in production mode

gulp.task('clean', function () {
    if (argv.production) {
        del.sync([paths.dest]);
    }
});





// Copy and minify HTML

gulp.task('html', function () {

    // Load the manifest. (If we use gulp-fingerprint's loading mechanism the
    // results will be cached.

    var manifest = fs.existsSync(paths.manifest) ? jsonfile.readFileSync(paths.manifest, {throws: false}) : null;

    if (!manifest && argv.production) {
        console.log("Error: a manifest must be present when running this task in production mode");
    } else {
        return gulp.src(paths.src.html + '**/*.html')
            .pipe(mustache(mustacheData, {}, mustachePartials))
            .pipe(fingerprint(manifest, fingerprintOptions))
            .pipe(htmlmin(htmlminOptions))
            .pipe(gulp.dest(paths.dest));
    }
});

// Watch for changes to the HTML and/or mustache partials

gulp.task('html:watch', function () {
    if (!argv.production) {
        gulp.watch(paths.src.html + '**/*.{html,mustache}', ['html']);
    } else {
        console.log('This task should not be run in production mode as it may cause problems with fingerprinting.')
    }
});





// Optimise images

gulp.task('imagemin', function () {
    return gulp.src(paths.src.images + '*', {base: paths.src.root})  // Use root as base to get paths in rev-manifest.json
        .pipe(imagemin(imageminOptions))
        .pipe(rev())    // Add cache-busting fingerprint
        .pipe(gulp.dest(paths.dest))
        .pipe(browserSync.stream())
        .pipe(rev.manifest(paths.manifest, revManifestOptions))
        .pipe(gulp.dest(paths.dest));
});

gulp.task('imagemin:watch', function () {
    if (!argv.production) {
        gulp.watch(paths.src.images + '*', ['imagemin']);
    } else {
        console.log('This task should not be run in production mode as it may cause problems with fingerprinting.')
    }
});





// Concatenate JavaScript

/**
 * Note: this method is deprecated. User Browserify for all new script bundles.
 **/

gulp.task('js-concat', function () {

    // Loop through each bundle.

    jsList.forEach(function (bundle) {

        return gulp.src(bundle.source, {base: paths.src.root})  // Use root as base to get paths in rev-manifest.json
            .pipe(concat(bundle.filename))
            .pipe(rename(function (path) {
                path.dirname = "js";    // Set the destination directory
                return path;
             }))
            .pipe(rev())    // Add cache-busting fingerprint
            .pipe(uglify())    // Uglify and fingerprint if in production mode
            .pipe(gulp.dest(paths.dest))
            .pipe(browserSync.stream())
            .pipe(rev.manifest(paths.manifest, revManifestOptions))
            .pipe(gulp.dest(paths.dest));

    });

});

gulp.task('js-concat:watch', function () {
    if (!argv.production) {
        gulp.watch(paths.src.js + '**/*.js', ['js-concat']);
    } else {
        console.log('This task should not be run in production mode as it may cause problems with fingerprinting.')
    }
});





// Compile CSS from Sass/sass

gulp.task('sass', function () {

    // Load the manifest. (If we use gulp-fingerprint's loading mechanism the
    // results will be cached.

    var manifest = fs.existsSync(paths.manifest) ? jsonfile.readFileSync(paths.manifest, {throws: false}) : null;

    if (!manifest && argv.production) {
        console.log("Error: a manifest must be present when running this task in production mode");
    } else {
        return gulp.src(paths.src.sass + '**/*.scss', {base: paths.src.root})  // Use root as base to get paths in rev-manifest.json
            .pipe(sass(sassOptions)
                .on('error', sass.logError))
            .pipe(fingerprint(manifest, fingerprintOptions))  // Update asset paths
            .pipe(autoprefixer(autoprefixerOptions))
            .pipe(rename(function (path) {
                path.dirname = path.dirname.replace(/^sass/, "css");    // Replace the sass folder with css
                return path;
             }))
            .pipe(rev())    // Add cache-busting fingerprint
            .pipe(minifyCss(minifyCssOptions))  // Minify if in production mode
            .pipe(gulp.dest(paths.dest))
            .pipe(browserSync.stream())
            .pipe(rev.manifest(paths.manifest, revManifestOptions))
            .pipe(gulp.dest(paths.dest));
    }
});

gulp.task('sass:watch', function () {
    if (!argv.production) {
        gulp.watch(paths.src.sass + '**/*.scss', ['sass']);     // TODO consider changing to gulp-watch so new files are detected
    } else {
        console.log('This task should not be run in production mode as it may cause problems with fingerprinting.')
    }
});





// Serve local files using browserSync

gulp.task('serve', function() {

    browserSync.init({
        server: paths.dest
    });

    gulp.watch(paths.dest + './*.html').on('change', browserSync.reload);
});


// Run all build tasks (once)

gulp.task('build', function(callback) {
    runSequence('clean', ['imagemin', 'js-concat'], 'sass', 'html', callback);
});


// Run all watch tasks. (Note that this won't do anything in production mode
// as running these tasks out of sequence in production mode will cause errors)

gulp.task('build:watch', ['html:watch', 'imagemin:watch', 'js-concat:watch', 'sass:watch']);


// Build, serve and watch

gulp.task('default', function(callback) {
    runSequence('build', 'serve', 'build:watch', callback)
});
