#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
env_file="${script_dir}/../.env"

if [[ ! -f "$env_file" ]]; then
  echo "Missing environment file: ${env_file}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

# don't want to run bootRun via script anymore
# exec "${script_dir}/gradlew" -p "$script_dir" bootRun
