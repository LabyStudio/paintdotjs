#!/bin/sh

export PAINTDOTJS_ASSETS_DIR=/app/share/paintdotjs/assets
export PAINTDOTJS_MANAGED_INSTALL=1
export PAINTDOTJS_DISTRIBUTION=Flatpak

exec zypak-wrapper /app/main/paintdotjs --class=net.paintjs.Paintjs "$@"
