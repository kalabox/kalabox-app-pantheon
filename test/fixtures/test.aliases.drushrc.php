<?php

/**
 * Test alias
 */
$aliases['kbox-test'] = array(
  'uri' => 'localhost',
  'root' => '/code',
  'databases' =>
    array (
      'default' =>
        array (
          'default' =>
            array (
              'driver' => 'mysql',
              'username' => 'pantheon',
              'password' => 'pantheon',
              'port' => 3306,
              'host' => 'database',
              'database' => 'pantheon',
            ),
        ),
    ),
);
