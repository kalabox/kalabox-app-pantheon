'use strict';

module.exports = function(grunt) {

  //--------------------------------------------------------------------------
  // SETUP CONFIG
  //--------------------------------------------------------------------------

  // Helpers to make things cleaner
  var funcOpts = {execOptions: {maxBuffer: 20 * 1024 * 1024}};
  var funcCommand = 'node_modules/bats/libexec/bats ${CI:+--tap}';

  // setup task config
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

    // This handles automatic version bumping
    bump: {
      options: {
        files: [
          'package.json',
          'app/package.json'
        ],
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
        prereleaseName: 'alpha',
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

    // Basic BATS test

    shell: {
      install: {
        options: funcOpts,
        command: funcCommand + ' ./test/install.bats'
      },
      images: {
        options: funcOpts,
        command: funcCommand + ' ./test/images.bats'
      },
      drupal7: {
        options: funcOpts,
        command: [
          funcCommand,
          './test/drupal7/create.bats',
          './test/drupal7/actions.bats',
          './test/drupal7/commands.bats',
          './test/drupal7/finish.bats'
        ].join(' ')
      },
      drupal8: {
        options: funcOpts,
        command: [
          funcCommand,
          './test/drupal8/create.bats',
          './test/drupal8/actions.bats',
          './test/drupal8/commands.bats',
          './test/drupal8/finish.bats'
        ].join(' ')
      },
      backdrop: {
        options: funcOpts,
        command: [
          funcCommand,
          './test/backdrop/create.bats',
          './test/backdrop/actions.bats',
          './test/backdrop/commands.bats',
          './test/backdrop/finish.bats'
        ].join(' ')
      },
      wordpress: {
        options: funcOpts,
        command: [
          funcCommand,
          './test/wordpress/create.bats',
          './test/wordpress/actions.bats',
          './test/wordpress/commands.bats',
          './test/wordpress/finish.bats'
        ].join(' ')
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
   * Code tests
   */
  // Standards and code
  grunt.registerTask('test:code', [
    'jshint',
    'jscs'
  ]);

  /*
   * Functional tests
   */
  // Verify the install
  grunt.registerTask('test:install', [
    'shell:install'
  ]);
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

  // All Basic tests
  grunt.registerTask('test:basic', [
    'shell:install',
    'shell:images'
  ]);
  // All Framework tests
  grunt.registerTask('test:frameworks', [
    'shell:drupal7',
    'shell:drupal8',
    'shell:backdrop',
    'shell:wordpress'
  ]);
  // All Common tests
  grunt.registerTask('test:common', [
    'shell:install',
    'shell:images'
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
