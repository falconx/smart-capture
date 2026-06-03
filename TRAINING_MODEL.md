## Updating the Document Detection Model

This project uses a YOLOv8 Oriented Bounding Box (OBB) model to detect documents in images.

### 1. Obtain a Training Dataset

Collect a set of images containing the document types you want the model to detect.

For best results, include a variety of:

- Document types
- Orientations and rotations
- Lighting conditions
- Backgrounds and environments
- Partial occlusions

### 2. Label the Images

Label the images using an annotation tool such as [Label Studio](https://labelstud.io) with, for example, `passport` or `driving_licence`.

Export the annotations using one of the following formats:

- YOLOv8 OBB
- YOLOv8 OBB with Images

### 3. Prepare the Dataset

Extract the exported dataset into `data/document_detection/`

```text
data/document_detection/
├── images/
│   ├── train/
│   └── val/
└── labels/
    ├── train/
    └── val/
```

Move the exported image and label files into the appropriate directories.

A typical split is:

- 80% of images in `train`
- 20% of images in `val`

Each image must have a corresponding label file with the same filename.

Example:

```text
images/train/example.jpg
labels/train/example.txt
```

You can do also achieve this by simply running `npm run split-dataset`

### 4. Configure the Dataset

Create `data/document_detection/data.yaml` and list all supported object classifications (labels), for example:

```yaml
path: data/document_detection

train: images/train
val: images/val

names:
  0: passport
  1: driving_licence
  2: identity_card
```

### 5. Train the Model

Run:

```bash
yolo obb train \
  model=yolov8n-obb.pt \
  data=data/document_detection/data.yaml \
  epochs=50 \
  imgsz=640 \
  batch=4
```

Training artifacts will be written to `runs/obb/train/`

### 6. Retrieve the Trained Model

After training completes, the best-performing model will be available at `runs/obb/train/weights/best.pt`

Convert the model to onnx format:

```bash
yolo export \
  model=runs/obb/train/weights/best.pt \
  format=onnx
```

Copy this file into `public/models/` and, if necessary, update references in code, e.g. at `src/app/yolo-detector.ts`.
