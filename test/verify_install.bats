#!/usr/bin/env bats

# Check that the CLI returns things
@test "Check that kalabox-cli exists" {
  run kbox
  [ "$status" -eq 1 ]
}
