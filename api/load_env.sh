#!/bin/bash

# only for linux
set -a
source ../.env
set +a
./gradlew bootRun
