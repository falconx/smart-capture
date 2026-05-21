# YOLOv8 Document Detection Integration

## Overview

This document describes the YOLOv8-based document detection system that replaces the OpenCV contour-based `checkDocumentInFrame` function.

## Why YOLO Instead of OpenCV?

The original OpenCV approach had limitations:

- ❌ Struggled with non-rectangular documents (passports with rounded corners)
- ❌ Sensitive to background noise and complex textures
- ❌ Required strict geometric constraints (aspect ratio, rectangularity, solidity)
- ❌ Failed with documents that don't have clear rectangular edges

The YOLO-based approach provides:

- ✅ Robust detection across various document types
- ✅ Handles complex backgrounds and noise
- ✅ Works with non-rectangular documents
- ✅ ML-based detection is more flexible and accurate
- ✅ Fast inference (~20-50ms per frame)

## Architecture

### Model: YOLOv8n (Nano)

- **Size**: ~12MB ONNX format
- **Input**: 640x640 RGB image
- **Output**: Bounding boxes + confidence scores
- **Classes**: Uses COCO dataset (80 classes)
  - Primary: Class 73 (book) - works well for documents
  - Fallback: Any high-confidence detection (>0.6)

### Runtime: ONNX Runtime Web

- Runs in browser using WebAssembly
- No backend required
- Efficient CPU inference

## File Structure

```
src/app/
├── yolo-detector.ts       # YOLO inference engine
├── utils.ts               # Quality check functions (updated)
└── page.tsx              # Main component (updated)

public/models/
└── yolov8n.onnx          # Pre-trained YOLO model (12MB)
```

## Implementation Details

### 1. DocumentDetector Class (`yolo-detector.ts`)

```typescript
class DocumentDetector {
  - initialize(): Load ONNX model
  - detect(canvas): Run inference on canvas
  - preprocessImage(): Convert canvas to YOLO input format
  - postprocessOutput(): Parse YOLO output, apply NMS
}
```

**Key Methods:**

- **Preprocessing**: Resizes image to 640x640, normalizes to [0,1], converts to CHW format
- **Inference**: Runs ONNX model with WebAssembly backend
- **Postprocessing**: Parses detections, applies Non-Maximum Suppression (NMS), filters by confidence

### 2. Updated Quality Check (`utils.ts`)

```typescript
export const checkDocumentInFrame = async (
  canvas: HTMLCanvasElement,
  detector: DocumentDetector | null,
): Promise<boolean>
```

- Now accepts canvas and detector instance
- Returns Promise<boolean> (async)
- Confidence threshold: 0.5

### 3. Integration (`page.tsx`)

**Initialization:**

```typescript
useEffect(() => {
  const detector = new DocumentDetector();
  await detector.initialize();
  detectorRef.current = detector;
}, []);
```

**Frame Processing:**

```typescript
const docInFrame = await checkDocumentInFrame(canvas, detectorRef.current);
```

## Configuration

### Confidence Threshold

Adjust in `yolo-detector.ts`:

```typescript
private confidenceThreshold = 0.5; // Default: 0.5
```

### Accepted Classes

Modify detection logic in `detect()` method:

```typescript
const documentDetections = detections.filter(
  (det) =>
    det.class === 73 || // book
    det.confidence > 0.6, // or any high-confidence detection
);
```

### Model Path

Change in constructor:

```typescript
constructor(modelPath: string = "/models/yolov8n.onnx")
```

## Performance

- **Model Load Time**: ~500ms-1s (one-time on mount)
- **Inference Time**: ~20-50ms per frame
- **Memory Usage**: +12MB for model
- **Frame Rate Impact**: Minimal (similar to OpenCV)

## Using a Custom Model

If you want to train your own document detection model:

### 1. Train YOLOv8 Model

```python
from ultralytics import YOLO

# Load a model
model = YOLO('yolov8n.pt')

# Train on your dataset
model.train(
    data='document_dataset.yaml',
    epochs=100,
    imgsz=640,
    batch=16
)

# Export to ONNX
model.export(format='onnx', imgsz=640)
```

### 2. Dataset Format

Create a dataset with:

- **Classes**: "document", "passport", "id_card", etc.
- **Format**: YOLO format (txt files with bounding boxes)
- **Images**: Various documents in different conditions

### 3. Replace Model

```bash
# Replace the model file
cp your-model.onnx public/models/yolov8n.onnx
```

### 4. Update Class IDs

Modify `yolo-detector.ts` to match your custom classes:

```typescript
const documentDetections = detections.filter(
  (det) =>
    det.class === 0 || // your "document" class
    det.class === 1, // your "passport" class
);
```

## Troubleshooting

### Model Fails to Load

- Check browser console for errors
- Verify model file exists at `/models/yolov8n.onnx`
- Ensure ONNX Runtime WASM files are accessible

### Poor Detection Performance

- Adjust confidence threshold (lower = more detections)
- Check lighting conditions
- Verify model is appropriate for your document types

### Slow Inference

- YOLOv8n is already the smallest model
- Consider reducing frame processing rate
- Check if running on low-end device

## Future Improvements

1. **Custom Training**: Train on specific document types (passports, IDs, licenses)
2. **Multi-Class Detection**: Distinguish between document types
3. **Bounding Box Visualization**: Draw detected regions on overlay
4. **Confidence Display**: Show detection confidence to user
5. **Model Caching**: Use Service Worker to cache model file
6. **WebGPU Backend**: Use GPU acceleration when available

## Dependencies

```json
{
  "onnxruntime-web": "^1.20.1"
}
```

## Browser Compatibility

- ✅ Chrome/Edge (full support)
- ✅ Firefox (full support)
- ✅ Safari (full support)
- ✅ Mobile browsers (full support)

## License

The YOLOv8 model is licensed under AGPL-3.0. For commercial use, consider Ultralytics licensing or train your own model.

---

**Note**: The current implementation uses the general COCO-trained YOLOv8n model. For production use, consider training a custom model specifically on identity documents for better accuracy.
