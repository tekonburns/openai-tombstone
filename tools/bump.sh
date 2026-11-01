#!/bin/sh
# Stamp a fresh ?v= on the CSS/JS URLs so returning browsers fetch the new build (GitHub Pages caches for 10 min).
cd "$(dirname "$0")/.." || exit 1
V=$(date -u +%Y%m%d%H%M)
sed -i.bak -E "s#href=\"css/style.css(\?v=[0-9]+)?\"#href=\"css/style.css?v=$V\"#; s#src=\"js/([a-z]+)\.js(\?v=[0-9]+)?\"#src=\"js/\1.js?v=$V\"#g" index.html && rm -f index.html.bak
echo "assets stamped ?v=$V"
