#!/usr/bin/env bash
# Path function
realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}

# Variables
SCRIPT_PATH=$(dirname $(realpath $0))
BIN_PATH=$(dirname ${SCRIPT_PATH})
PROJECT_PATH=$(dirname ${BIN_PATH})

${PROJECT_PATH}/k8s/bin/install.sh