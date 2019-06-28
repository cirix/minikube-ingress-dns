#!/usr/bin/env bash

set -e

realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}
SCRIPT_PATH=$(realpath $0)
BIN_DIRECTORY=$(dirname ${SCRIPT_PATH})
CONFIG_DIRECTORY=$(dirname ${BIN_DIRECTORY})

if [[ -z $(helm ls | grep minikube-dns) ]]; then
    kubectl patch deployment nginx-ingress-controller -n kube-system --patch '{"spec":{"template":{"spec":{"hostNetwork":true}}}}'
    kubectl apply -f ${CONFIG_DIRECTORY}/overrides
    helm install ${CONFIG_DIRECTORY} --name minikube-dns --set minikubeIP=$(minikube ip) --replace
fi