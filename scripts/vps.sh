#!/usr/bin/env bash
# Manage the Infinite Flow website on the shared production VPS (https://infinite.upsilon-hub.com).
# The full runbook is ~/infinite-flow/README_INFINITE_FLOW.md on the VPS.
#
# Hard rules (the VPS also serves filetstudio, which must never go down):
#   - only ~/infinite-flow is used; never cd into ~/crochethub, never touch the Caddyfile;
#   - no docker command on crochethub-* containers, no `docker system prune`,
#     no `docker network rm`, no `-v`/`--rmi` on down;
#   - every remote docker command runs as `cd ~/infinite-flow || exit 1; docker ...`;
#   - every mutating command first checks that the compose project there is `infinite-flow`.
#
# Usage: scripts/vps.sh update [ref] | stop | start | status | rollback | -h
# Set VPS_HOST to use another SSH host alias (default: vps).
set -euo pipefail

VPS_HOST="${VPS_HOST:-vps}"
APP_URL="https://infinite.upsilon-hub.com"
SHARED_URL="https://filetstudio.com"
CONTAINER="infinite-flow-web"
IMAGE="infinite-flow:vps"
PREV_IMAGE="infinite-flow:vps-prev"
HEALTH_TIMEOUT=60

usage() {
  cat <<'EOF'
Usage: scripts/vps.sh <command>

Manage the Infinite Flow website on the shared production VPS (ssh host: $VPS_HOST, default vps).

Commands:
  update [ref]  Ship a committed ref (default HEAD), rebuild on freshly pulled base images
                and restart; keeps the previous image as infinite-flow:vps-prev for rollback.
  stop          Stop the container (reversible; infinity.* then answers 502).
  start         Start the container again.
  status        Show the container, the deployed commit and both sites' HTTP status (read-only).
  rollback      Switch back to infinite-flow:vps-prev and restart.
  -h, --help    Show this help.
EOF
}

log() { printf '==> %s\n' "$*"; }
warn() { printf 'WARNING: %s\n' "$*" >&2; }
die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

# Run a command string on the VPS. The remote shell evaluates it, so a ~ in it expands there.
# shellcheck disable=SC2029 # local expansion of $1 is intended; callers keep remote parts quoted.
remote() { ssh "$VPS_HOST" "$1"; }

# Run a command string inside ~/infinite-flow on the VPS; fail hard if the cd fails.
in_app_dir() { remote "cd ~/infinite-flow || exit 1; $1"; }

# Abort unless ~/infinite-flow holds the infinite-flow compose project.
assert_project() {
  in_app_dir 'grep -qx "name: infinite-flow" compose.yaml && docker compose config | grep -qx "name: infinite-flow"' ||
    die "the ~/infinite-flow directory on $VPS_HOST is not the infinite-flow compose project; aborting."
}

image_exists() { in_app_dir "docker image inspect $1 >/dev/null 2>&1"; }

# Print the HTTP status code of a URL as seen from this machine (000 if unreachable).
http_code() { curl -s -o /dev/null -m 15 -w '%{http_code}' "$1" || true; }

# Poll the container health until it is healthy or HEALTH_TIMEOUT seconds have passed.
wait_healthy() {
  local status deadline=$((SECONDS + HEALTH_TIMEOUT))
  log "waiting for $CONTAINER to be healthy (up to ${HEALTH_TIMEOUT}s)"
  while true; do
    status=$(in_app_dir "docker inspect -f '{{.State.Health.Status}}' $CONTAINER" 2>/dev/null || echo unknown)
    if [[ $status == healthy ]]; then
      log "$CONTAINER is healthy"
      return 0
    fi
    if ((SECONDS >= deadline)); then
      warn "$CONTAINER is '$status', not healthy, after ${HEALTH_TIMEOUT}s"
      return 1
    fi
    sleep 3
  done
}

# Check both public URLs. $1 = "up" (infinity must answer 200) or "stopped" (infinity not checked).
check_sites() {
  local expect=$1 app shared rc=0
  app=$(http_code "$APP_URL")
  shared=$(http_code "$SHARED_URL")
  printf '    %s -> %s\n    %s -> %s\n' "$APP_URL" "$app" "$SHARED_URL" "$shared"
  if [[ $expect == up && $app != 200 ]]; then
    warn "$APP_URL answered $app, expected 200"
    rc=1
  fi
  if [[ $shared != 200 ]]; then
    printf '\n%s\n' '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!' >&2
    printf '!!! %s answered %s: the SHARED site looks DOWN.\n' "$SHARED_URL" "$shared" >&2
    printf '!!! This script did not touch it (only ~/infinite-flow). Check it now.\n' >&2
    printf '%s\n\n' '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!' >&2
    rc=1
  fi
  return "$rc"
}

# Health + HTTP check after the container was (re)started.
post_check() {
  local rc=0
  wait_healthy || rc=1
  log "checking the public URLs"
  check_sites up || rc=1
  if ((rc != 0)); then
    die "post-check failed"
  fi
  log "post-check passed"
}

cmd_update() {
  local ref=${1:-HEAD} sha short subject
  sha=$(git rev-parse --verify --quiet "${ref}^{commit}") || die "cannot resolve '$ref' to a commit"
  short=$(git rev-parse --short "$sha")
  subject=$(git log -1 --format=%s "$sha")
  log "deploying $short $subject"
  if [[ -n $(git status --porcelain) ]]; then
    warn "the working tree is dirty; only the committed content of $short ships"
  fi

  assert_project

  if image_exists "$IMAGE"; then
    in_app_dir "docker tag $IMAGE $PREV_IMAGE"
    log "kept the current image as $PREV_IMAGE"
  else
    log "no current $IMAGE image; nothing kept for rollback"
  fi
  in_app_dir 'if [ -f DEPLOYED_COMMIT ]; then cp DEPLOYED_COMMIT DEPLOYED_COMMIT.prev; fi'

  log "shipping the source of $short"
  git archive "$sha" |
    remote 'rm -rf ~/infinite-flow/src.new && mkdir ~/infinite-flow/src.new && tar -x -C ~/infinite-flow/src.new && rm -rf ~/infinite-flow/src && mv ~/infinite-flow/src.new ~/infinite-flow/src' ||
    die "shipping the source failed; the old container keeps serving"

  log "building the image (pulling current base images, nice -n 19)"
  in_app_dir 'nice -n 19 docker compose build --pull' ||
    die "build failed; the container was NOT restarted, the old one keeps serving (src/ now holds $short)"

  log "starting the new container"
  in_app_dir 'docker compose up -d'
  printf '%s %s\ndeployed %s\n' "$sha" "$subject" "$(date -u '+%Y-%m-%d %H:%M:%S UTC')" |
    remote 'cat > ~/infinite-flow/DEPLOYED_COMMIT'

  post_check
}

cmd_stop() {
  assert_project
  log "stopping the container"
  in_app_dir 'docker compose stop'
  log "checking the shared site (infinity.* is expected to answer 502 now)"
  check_sites stopped || die "post-check failed"
  log "stopped; run 'scripts/vps.sh start' to bring it back"
}

cmd_start() {
  assert_project
  log "starting the container"
  in_app_dir 'docker compose up -d'
  post_check
}

cmd_status() {
  log "container"
  in_app_dir 'docker compose ps -a'
  log "deployed commit"
  in_app_dir 'if [ -f DEPLOYED_COMMIT ]; then cat DEPLOYED_COMMIT; else echo "(no DEPLOYED_COMMIT file)"; fi'
  log "HTTP status"
  check_sites up || true
}

cmd_rollback() {
  local current_id
  assert_project
  image_exists "$PREV_IMAGE" || die "no $PREV_IMAGE image on $VPS_HOST; nothing to roll back to"

  # Swap the two tags so a second rollback undoes the first, like the DEPLOYED_COMMIT swap below.
  current_id=$(in_app_dir "docker image inspect -f '{{.Id}}' $IMAGE" 2>/dev/null || true)
  in_app_dir "docker tag $PREV_IMAGE $IMAGE"
  if [[ -n $current_id ]]; then
    in_app_dir "docker tag $current_id $PREV_IMAGE"
  fi
  log "$IMAGE now points at the previous image"

  in_app_dir 'docker compose up -d'
  in_app_dir 'if [ -f DEPLOYED_COMMIT.prev ]; then
    if [ -f DEPLOYED_COMMIT ]; then mv DEPLOYED_COMMIT DEPLOYED_COMMIT.swap; fi
    mv DEPLOYED_COMMIT.prev DEPLOYED_COMMIT
    if [ -f DEPLOYED_COMMIT.swap ]; then mv DEPLOYED_COMMIT.swap DEPLOYED_COMMIT.prev; fi
  fi'

  post_check
}

main() {
  # Run git commands from the repository root, wherever the script is called from.
  cd "$(dirname "${BASH_SOURCE[0]}")/.."

  local cmd=${1:-}
  case $cmd in
    update)
      (($# <= 2)) || die "update takes at most one ref"
      cmd_update "${2:-HEAD}"
      ;;
    stop | start | status | rollback)
      (($# == 1)) || die "$cmd takes no argument"
      "cmd_$cmd"
      ;;
    -h | --help | help)
      usage
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
}

main "$@"
