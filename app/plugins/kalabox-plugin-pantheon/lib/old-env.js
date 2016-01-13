
/*

      // Only run on the appserver container
      // Symlinks
      else if (component.name === 'appserver') {
        // Emulate /srv/bindings
        var cmd = ['mkdir', '-p', '/srv/bindings'];
        return kbox.engine.queryData(component.containerId, cmd)
        // If on drops8 make sure styles dir exists
        .then(function() {
          if (framework === 'drupal8') {
            var cmd = ['mkdir', '-p', '/media/styles'];
            return kbox.engine.queryData(component.containerId, cmd);
          }
        })
        // Emulate /srv/bindings
        .then(function() {
          var cmd = ['ln', '-nsf', '/', '/srv/bindings/kalabox'];
          return kbox.engine.queryData(component.containerId, cmd);
        })
        // Check if symlink dir exists
        .then(function() {
          var fileMount = frameworkSpec[framework].filemount;
          var upOneDir = fileMount.split('/');
          upOneDir.pop();
          var codeDir = app.config.codeDir;
          var dirCheck = '/' + [codeDir, upOneDir.join('/')].join('/');
          var cmd = ['ls', dirCheck];
          return kbox.engine.queryData(component.containerId, cmd);
        })
        // Check if we can create the symlink or not
        .catch(function(error) {
          return !_.contains(error.message, 'Non-zero exit code');
        })
        // Symlink the filemount to /media if appropriate
        .then(function(canCreate) {
          if (canCreate !== false) {
            var fileMount = frameworkSpec[framework].filemount;
            // Check if mount dir exists and set the symlink if it does
            var lnkFile = '/' + [app.config.codeDir, fileMount].join('/');
            var cmd = ['ln', '-nsf', '/media', lnkFile];
            return kbox.engine.queryData(component.containerId, cmd);
          }
        })

        .nodeify(done);

      }
      */
