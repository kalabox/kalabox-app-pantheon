'use strict';

module.exports = function(grunt) {

  //--------------------------------------------------------------------------
  // SETUP CONFIG
  //--------------------------------------------------------------------------

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
    bats: {
      files: ['test/basic/install.bats'],
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

  grunt.registerTask('test', [
    'jshint',
    'jscs',
    'bats'
  ]);

};
