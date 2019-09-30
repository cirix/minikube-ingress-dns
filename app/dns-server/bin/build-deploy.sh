#!/bin/sh -e

# Only run this build if files in the dns-server directory have changed.
if [[ ! -z "$(git log --name-status --oneline [HEAD...HEAD^1] | grep "app/dns-server/docker\|app/dns-server/nodejs" )" ]]; then
  version=$(jq -r '.version' app/dns-server/nodejs/package.json)
  docker build app/dns-server -f app/dns-server/docker/nodejs/Dockerfile --cache-from $CI_REGISTRY_IMAGE:latest --tag $CI_REGISTRY_IMAGE:$version --tag $CI_REGISTRY_IMAGE:latest
  echo "$GIT_SSH_PK" | base64 -d > id_rsa
  chmod 400 id_rsa
  echo 'ssh -i ./id_rsa -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no $*' > ssh
  chmod +x ssh
  git config --global user.name "$GIT_USER_NAME"
  git config --global user.email "$GIT_USER_EMAIL"
  git tag $version
  git remote set-url origin git@$CI_SERVER_HOST:$CI_PROJECT_PATH.git
  GIT_SSH='./ssh' git push origin $version
      # Docker push goes after git push so that if a tag already exists the push will be rejected to
      # prevent accidentally overwriting versioned tags. If you really want to overwrite a tag
      # first delete it in gitlab
  docker push $CI_REGISTRY_IMAGE:$version
  docker push $CI_REGISTRY_IMAGE:latest
fi