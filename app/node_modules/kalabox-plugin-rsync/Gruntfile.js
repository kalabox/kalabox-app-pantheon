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
        ]
      }
    },

    // This handles automatic version bumping in travis
    bump: {
      options: {
        files: ['package.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json', 'bower.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: false
      }
    },

    // Some linting and code standards
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: ['Gruntfile.js', '<%= files.js.src %>']
    },
    jscs: {
      src: ['Gruntfile.js', '<%= files.js.src %>'],
      options: {
        config: '.jscsrc'
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

  grunt.registerTask('bump-patch', [
    'bump-only:patch'
  ]);

  grunt.registerTask('test', [
    'jshint',
    'jscs'
  ]);

};
