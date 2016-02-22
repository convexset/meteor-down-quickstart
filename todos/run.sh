#!/usr/bin/env bash

# Back to app folder
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
cd $DIR

METEOR_DOWN_KEY="METEOR_DOWN_KEY" meteor run --port 3000