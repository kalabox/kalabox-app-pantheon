'use strict';

module.exports = function(grunt) {

  //--------------------------------------------------------------------------
  // SETUP CONFIG
  //--------------------------------------------------------------------------

  // Helpers to make things cleaner
  var pkg = grunt.file.readJSON('./package.json');
  var dev = (grunt.option('dev')) ? '-dev' : '';
  var version = pkg.version + dev;
  var testOpts = {execOptions: {maxBuffer: 20 * 1024 * 1024}};
  var testCommand = 'node_modules/bats/libexec/bats ${CI:+--tap}';

  // Setup task config
  var config = {

    // Arrays of relevant code classified by type
    files: {
      js: {
        src: [
          '*.js',
          'lib/*.js',
          'scripts/*.js',
          'app/scripts/*.js',
          'app/plugins/*/*.js',
          'app/plugins/*/lib/*.js'
        ]
      }
    },

    // Clean out the build dirs
    clean: {
      build: ['build', 'dist'],
    },

    // Copy relevant things
    copy: {
      app: {
        src: [
          'index.js',
          'lib/*.js',
          'app/**/*',
          'app/.gitignore',
          'package.json'
        ],
        dest: 'build',
        expand: true,
        options: {
          mode: true,
          noProcess: [
            'app/*.{png,gif,jpg,ico,psd,ttf,otf,woff,svg}'
          ],
          process: function(content, srcPath) {
            // Switch it up
            switch (srcPath) {
              // Return a dev version
              case 'app/package.json':
                return content.replace(pkg.version, version);
              case 'package.json':
                return content.replace(pkg.version, version);
              default:
                return content;
            }
          },
        }
      }
    },

    // Compress build
    compress: {
      tar: {
        options: {
          archive: 'dist/kalabox-app-pantheon.tar.gz'
        },
        expand: true,
        cwd: 'build/',
        src: ['**'],
        dest: './'
      },
      zip: {
        options: {
          archive: 'dist/kalabox-app-pantheon.zip'
        },
        expand: true,
        cwd: 'build/',
        src: ['**'],
        dest: './'
      }
    },

    // This handles automatic version bumping
    bump: {
      options: {
        files: ['package.json', 'app/package.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json', 'app/package.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        pushTo: 'origin',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
        globalReplace: false,
        prereleaseName: 'rc',
        metadata: '',
        regExp: false
      }
    },

    // Some linting and code standards
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: ['Gruntfile.js', '<%= files.js.src %>', 'index.js']
    },
    jscs: {
      src: ['Gruntfile.js', '<%= files.js.src %>', 'index.js'],
      options: {
        config: '.jscsrc'
      }
    },
    mdlint: ['docs/**/*.md'],

    // Shell things
    shell: {

      // Tests
      images: {
        options: testOpts,
        command: testCommand + ' ./test/images.bats'
      },
      drupal7: {
        options: testOpts,
        command: testCommand + ' ./test/drupal7.bats'
      },
      drupal8: {
        options: testOpts,
        command: testCommand + ' ./test/drupal8.bats'
      },
      backdrop: {
        options: testOpts,
        command: testCommand + ' ./test/backdrop.bats'
      },
      wordpress: {
        options: testOpts,
        command: testCommand + ' ./test/wordpress.bats'
      },
      drush: {
        options: testOpts,
        command: testCommand + ' ./test/drush.bats'
      },

      // Build
      build: {
        options: {
          execOptions: {
            maxBuffer: 20 * 1024 * 1024,
            cwd: 'build'
          }
        },
        command: 'npm install --production'
      }
    }

  };

  //--------------------------------------------------------------------------
  // LOAD TASKS
  //--------------------------------------------------------------------------

  // load task config
  grunt.initConfig(config);

  // load external tasks
  //grunt.loadTasks('tasks');

  // load grunt-* tasks from package.json dependencies
  require('matchdep').filterAll('grunt-*').forEach(grunt.loadNpmTasks);

  //--------------------------------------------------------------------------
  // SETUP WORKFLOWS
  //--------------------------------------------------------------------------

  /*
   * Bump Taskz
   */
  // Bump our minor version
  grunt.registerTask('bigrelease', [
    'bump:minor'
  ]);
  // Bump our patch version
  grunt.registerTask('release', [
    'bump:patch'
  ]);
  // Do a prerelease version
  grunt.registerTask('prerelease', [
    'bump:prerelease'
  ]);

  /*
   * Pkg tasks
   */
  // Build out an app
  grunt.registerTask('pkg', [
    'clean:build',
    'copy:app',
    'shell:build',
    'compress:tar',
    'compress:zip'
  ]);

  /*
   * Code tests
   */
  // Standards and code
  grunt.registerTask('test:code', [
    'jshint',
    'jscs'
    // 'mdlint'
  ]);

  /*
   * Functional tests
   */
  // Build the images
  grunt.registerTask('test:images', [
    'shell:images'
  ]);
  // Basic Drupal 7 tests
  grunt.registerTask('test:drupal7', [
    'shell:drupal7'
  ]);
  // Basic Drupal 8 tests
  grunt.registerTask('test:drupal8', [
    'shell:drupal8'
  ]);
  // Basic Backdrop tests
  grunt.registerTask('test:backdrop', [
    'shell:backdrop'
  ]);
  // Basic Wordpress tests
  grunt.registerTask('test:wordpress', [
    'shell:wordpress'
  ]);
  // Basic Drush tests
  grunt.registerTask('test:drush', [
    'shell:drush'
  ]);

  // All Framework tests
  grunt.registerTask('test:frameworks', [
    'shell:drupal7',
    'shell:drupal8',
    'shell:backdrop',
    'shell:wordpress'
  ]);
  // All Func tests
  grunt.registerTask('test:func', [
    'test:images',
    'test:frameworks',
    'test:drush'
  ]);

  /*
   * All tests
   */
  // All tests
  grunt.registerTask('test', [
    'test:code',
    'test:func'
  ]);

};
