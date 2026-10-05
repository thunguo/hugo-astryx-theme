#!/usr/bin/env bash
set -euo pipefail

: "${HUGO_VERSION:?Set HUGO_VERSION to the pinned release version}"
: "${HUGO_ARCHIVE_SHA256:?Set HUGO_ARCHIVE_SHA256 to the official release checksum}"
: "${RUNNER_TEMP:?This installer runs in GitHub Actions}"
: "${GITHUB_PATH:?GitHub Actions must provide GITHUB_PATH}"

task_hugo_dir="$(mktemp -d "${RUNNER_TEMP}/hugo.XXXXXX")"
task_hugo_archive="hugo_${HUGO_VERSION}_linux-amd64.tar.gz"
task_hugo_url="https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/${task_hugo_archive}"

curl --fail --silent --show-error --location --retry 3 \
  --output "${task_hugo_dir}/${task_hugo_archive}" "${task_hugo_url}"

printf '%s  %s\n' "${HUGO_ARCHIVE_SHA256}" "${task_hugo_dir}/${task_hugo_archive}" \
  | sha256sum --check --strict

tar --extract --gzip --file "${task_hugo_dir}/${task_hugo_archive}" \
  --directory "${task_hugo_dir}" hugo

printf '%s\n' "${task_hugo_dir}" >> "${GITHUB_PATH}"
"${task_hugo_dir}/hugo" version
