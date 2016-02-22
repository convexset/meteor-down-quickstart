#!/usr/bin/env bash

# Back to app folder
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
cd $DIR

NODE_PATH=$(pwd) meteor-down load-test.js 