/* eslint-disable @typescript-eslint/no-explicit-any */
import * as ort from "onnxruntime-web";

export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  confidence: number;
  class: number;
}

export interface DetectionResult {
  detected: boolean;
  confidence: number;
  bbox?: [number, number, number, number];
  detections: Detection[];
}

export class DocumentDetector {
  private session: ort.InferenceSession | null = null;
  private modelPath: string;
  private inputSize = 640;
  private confidenceThreshold = 0.5;
  private iouThreshold = 0.45;

  constructor(modelPath: string = "/models/document-detector-2.onnx") {
    this.modelPath = modelPath;
  }

  async initialize(): Promise<void> {
    try {
      // Configure ONNX Runtime for web
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;

      // Fetch the model file
      const response = await fetch(this.modelPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch model: ${response.statusText}`);
      }
      const modelBuffer = await response.arrayBuffer();

      this.session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ["wasm"],
      });

      console.log("YOLO model loaded successfully");
      console.log("Input names:", this.session.inputNames);
      console.log("Output names:", this.session.outputNames);
    } catch (error) {
      console.error("Failed to load YOLO model:", error);
      throw error;
    }
  }

  private preprocessImage(canvas: HTMLCanvasElement): Float32Array {
    // Create a temporary canvas for resizing
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = this.inputSize;
    tempCanvas.height = this.inputSize;
    const ctx = tempCanvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Draw and resize image to 640x640
    ctx.drawImage(canvas, 0, 0, this.inputSize, this.inputSize);

    // Get image data
    const imageData = ctx.getImageData(0, 0, this.inputSize, this.inputSize);
    const pixels = imageData.data;

    // Convert to RGB and normalize to [0, 1]
    // YOLO expects CHW format: [1, 3, 640, 640]
    const float32Data = new Float32Array(3 * this.inputSize * this.inputSize);

    for (let i = 0; i < pixels.length; i += 4) {
      const pixelIndex = i / 4;
      const r = pixels[i] / 255.0;
      const g = pixels[i + 1] / 255.0;
      const b = pixels[i + 2] / 255.0;

      // CHW format: all reds, then all greens, then all blues
      float32Data[pixelIndex] = r;
      float32Data[this.inputSize * this.inputSize + pixelIndex] = g;
      float32Data[2 * this.inputSize * this.inputSize + pixelIndex] = b;
    }

    return float32Data;
  }

  private nonMaxSuppression(detections: Detection[]): Detection[] {
    // Sort by confidence (descending)
    detections.sort((a, b) => b.confidence - a.confidence);

    const selected: Detection[] = [];

    while (detections.length > 0) {
      const current = detections.shift()!;
      selected.push(current);

      detections = detections.filter((det) => {
        const iou = this.calculateIoU(current.bbox, det.bbox);
        return iou < this.iouThreshold;
      });
    }

    return selected;
  }

  private calculateIoU(
    box1: [number, number, number, number],
    box2: [number, number, number, number],
  ): number {
    const [x1, y1, w1, h1] = box1;
    const [x2, y2, w2, h2] = box2;

    const x1_max = x1 + w1;
    const y1_max = y1 + h1;
    const x2_max = x2 + w2;
    const y2_max = y2 + h2;

    const intersect_x1 = Math.max(x1, x2);
    const intersect_y1 = Math.max(y1, y2);
    const intersect_x2 = Math.min(x1_max, x2_max);
    const intersect_y2 = Math.min(y1_max, y2_max);

    const intersect_w = Math.max(0, intersect_x2 - intersect_x1);
    const intersect_h = Math.max(0, intersect_y2 - intersect_y1);
    const intersect_area = intersect_w * intersect_h;

    const box1_area = w1 * h1;
    const box2_area = w2 * h2;
    const union_area = box1_area + box2_area - intersect_area;

    return intersect_area / union_area;
  }

  private postprocessOutput(
    output: any,
    originalWidth: number,
    originalHeight: number,
  ): Detection[] {
    const detections: Detection[] = [];

    // YOLOv8-OBB output format: [1, 5, 8400]
    // 5 = 4 bbox coords + 1 class score (passport)
    const data = output.data;
    const numDetections = output.dims[2]; // 8400

    for (let i = 0; i < numDetections; i++) {
      // Extract bbox coordinates (center_x, center_y, width, height)
      const cx = data[i];
      const cy = data[numDetections + i];
      const w = data[2 * numDetections + i];
      const h = data[3 * numDetections + i];

      // Find max class score and class index
      let maxScore = 0;
      let maxClass = 0;

      for (let c = 0; c < 1; c++) {
        const score = data[(4 + c) * numDetections + i];
        if (score > maxScore) {
          maxScore = score;
          maxClass = c;
        }
      }

      // Filter by confidence threshold
      if (maxScore > this.confidenceThreshold) {
        // Convert from center format to corner format
        const x = (cx - w / 2) * (originalWidth / this.inputSize);
        const y = (cy - h / 2) * (originalHeight / this.inputSize);
        const width = w * (originalWidth / this.inputSize);
        const height = h * (originalHeight / this.inputSize);

        detections.push({
          bbox: [x, y, width, height],
          confidence: maxScore,
          class: maxClass,
        });
      }
    }

    return this.nonMaxSuppression(detections);
  }

  async detect(canvas: HTMLCanvasElement): Promise<DetectionResult> {
    if (!this.session) {
      throw new Error("Model not initialized. Call initialize() first.");
    }

    try {
      // Preprocess image
      const inputData = this.preprocessImage(canvas);

      // Create tensor
      const tensor = new ort.Tensor("float32", inputData, [
        1,
        3,
        this.inputSize,
        this.inputSize,
      ]);

      // Run inference
      const feeds: Record<string, ort.Tensor> = {};
      feeds[this.session.inputNames[0]] = tensor;

      const results = await this.session.run(feeds);
      const output = results[this.session.outputNames[0]];

      // Postprocess output
      const detections = this.postprocessOutput(
        output,
        canvas.width,
        canvas.height,
      );

      // Filter for passport class (class 0) with confidence threshold
      const documentDetections = detections.filter(
        (det) => det.class === 0 && det.confidence > 0.5,
      );

      console.log(
        documentDetections.map((det) => ({
          class: det.class,
          confidence: det.confidence,
        })),
      );

      if (documentDetections.length > 0) {
        const best = documentDetections[0];
        return {
          detected: true,
          confidence: best.confidence,
          bbox: best.bbox,
          detections: documentDetections,
        };
      }

      return {
        detected: false,
        confidence: 0,
        detections: [],
      };
    } catch (error) {
      console.error("Detection error:", error);
      return {
        detected: false,
        confidence: 0,
        detections: [],
      };
    }
  }

  isInitialized(): boolean {
    return this.session !== null;
  }
}
