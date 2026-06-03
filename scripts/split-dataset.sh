#!/usr/bin/env bash

echo "Running split-dataset.sh"

set -euo pipefail

DATASET_DIR="data/document_detection"

IMAGES_DIR="$DATASET_DIR/images"
LABELS_DIR="$DATASET_DIR/labels"

TRAIN_IMAGES="$IMAGES_DIR/train"
VAL_IMAGES="$IMAGES_DIR/val"

TRAIN_LABELS="$LABELS_DIR/train"
VAL_LABELS="$LABELS_DIR/val"

mkdir -p "$TRAIN_IMAGES"
mkdir -p "$VAL_IMAGES"
mkdir -p "$TRAIN_LABELS"
mkdir -p "$VAL_LABELS"

TMP_FILE=$(mktemp)

find "$IMAGES_DIR" -maxdepth 1 -type f \
  \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) \
  > "$TMP_FILE"

TOTAL=$(wc -l < "$TMP_FILE" | tr -d ' ')
VAL_COUNT=$((TOTAL / 5))

if command -v gshuf >/dev/null 2>&1; then
  SHUF_CMD="gshuf"
elif command -v shuf >/dev/null 2>&1; then
  SHUF_CMD="shuf"
else
  echo "Error: shuf not found."
  echo "On macOS install it with:"
  echo "  brew install coreutils"
  exit 1
fi

$SHUF_CMD "$TMP_FILE" | head -n "$VAL_COUNT" > "${TMP_FILE}.val"

while read -r IMG; do
  FILE=$(basename "$IMG")
  STEM="${FILE%.*}"

  mv "$IMG" "$VAL_IMAGES/"
  mv "$LABELS_DIR/$STEM.txt" "$VAL_LABELS/"
done < "${TMP_FILE}.val"

find "$IMAGES_DIR" -maxdepth 1 -type f \
  \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) \
  -exec mv {} "$TRAIN_IMAGES/" \;

find "$LABELS_DIR" -maxdepth 1 -type f -name "*.txt" \
  -exec mv {} "$TRAIN_LABELS/" \;

rm -f "$TMP_FILE" "${TMP_FILE}.val"

echo "Dataset split complete."
echo
echo "Training images:   $(find "$TRAIN_IMAGES" -type f | wc -l)"
echo "Validation images: $(find "$VAL_IMAGES" -type f | wc -l)"
