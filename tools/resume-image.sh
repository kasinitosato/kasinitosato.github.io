#!/bin/sh
# Makes the picture of your resume shown on the Resume page and in the zoomable resume viewer.
# It is rendered large (3600 px tall) so the text stays sharp when zoomed in.
# The file name includes a fingerprint of the PDF, so visitors' browsers pick up the new picture.
# Run this after replacing public/media/resume/Kasin-Ito-Sato-Resume.pdf:
#   sh tools/resume-image.sh
set -e
cd "$(dirname "$0")/.."
pdf=public/media/resume/Kasin-Ito-Sato-Resume.pdf
tag=$(shasum "$pdf" | cut -c1-8)
tmp=$(mktemp -d)
qlmanage -t -s 3600 -o "$tmp" "$pdf" >/dev/null 2>&1
rm -f src/assets/resume-page*.png
cp "$tmp"/*.png "src/assets/resume-page-$tag.png"
rm -rf "$tmp"
echo "Updated src/assets/resume-page-$tag.png"
