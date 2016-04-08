#!/usr/bin/env bats

# Check that the Kalabox CLI is in the PATH
@test "Check that kalabox-cli is in PATH" {
  run which kbox
  [ "$status" -eq 0 ]
}

# Check that 'kbox' returns without error
@test "Check that 'kbox' returns without error" {
  run kbox
  [ "$status" -eq 1 ]
}

# Check that 'kbox config' returns without error
@test "Check that 'kbox config' returns without error" {
  run kbox config
  [ "$status" -eq 0 ]
}

# Check that 'kbox create' returns without error
@test "Check that 'kbox create' returns without error" {
  run kbox create
  [ "$status" -eq 1 ]
}

# Check that 'kbox create' contains 'pantheon' as a choice
@test "Check that 'kbox create' contains 'pantheon' as a choice" {
  kbox create | grep pantheon
}

# Check that 'kbox env' returns without error
@test "Check that 'kbox env' returns without error" {
  run kbox env
  [ "$status" -eq 0 ]
}

# Check that 'kbox list' returns without error
@test "Check that 'kbox list' returns without error" {
  run kbox list
  [ "$status" -eq 0 ]
}

# Check that 'kbox version' returns without error
@test "Check that 'kbox version' returns without error" {
  run kbox version
  [ "$status" -eq 0 ]
}

# Check that '.kbox' domains can be pinged
@test "Check that '10.13.37.100' can be pinged" {
  ping -c 1 10.13.37.100
}

# Check that '.kbox' domains can be pinged
@test "Check that '.kbox' domains can be pinged" {
  ping -c 1 something.kbox
}
