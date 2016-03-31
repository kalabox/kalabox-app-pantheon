#!/usr/bin/env bats

@test "Check that kalabox is installed" {
  kbox version
}
