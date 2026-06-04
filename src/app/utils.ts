// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import {
  BLUR_VARIANCE_THRESHOLD,
  LIGHTING_MIN_THRESHOLD,
  LIGHTING_MAX_THRESHOLD,
  GLARE_BRIGHTNESS_THRESHOLD,
  GLARE_PERCENTAGE_THRESHOLD,
  DOCUMENT_RECOGNITION_CONFIDENCE_THRESHOLD,
} from "../constants";

export const checkBlur = (src) => {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const lap = new cv.Mat();
  cv.Laplacian(gray, lap, cv.CV_64F);

  const mean = new cv.Mat();
  const stddev = new cv.Mat();
  cv.meanStdDev(lap, mean, stddev);

  const variance = stddev.data64F[0] ** 2;

  gray.delete();
  lap.delete();
  mean.delete();
  stddev.delete();

  return variance > BLUR_VARIANCE_THRESHOLD;
};

export const checkLighting = (src) => {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const mean = cv.mean(gray);
  gray.delete();

  return mean[0] > LIGHTING_MIN_THRESHOLD && mean[0] < LIGHTING_MAX_THRESHOLD;
};

export const checkGlare = (src) => {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const thresh = new cv.Mat();
  cv.threshold(gray, thresh, GLARE_BRIGHTNESS_THRESHOLD, 255, cv.THRESH_BINARY);

  const white = cv.countNonZero(thresh);
  const total = gray.rows * gray.cols;
  gray.delete();
  thresh.delete();

  return white / total > GLARE_PERCENTAGE_THRESHOLD;
};

import { DocumentDetector } from "./yolo-detector";

export const checkDocumentInFrame = async (
  canvas: HTMLCanvasElement,
  detector: DocumentDetector | null,
): Promise<boolean> => {
  if (!detector || !detector.isInitialized()) {
    return false;
  }

  try {
    const result = await detector.detect(canvas);
    return (
      result.detected &&
      result.confidence > DOCUMENT_RECOGNITION_CONFIDENCE_THRESHOLD
    );
  } catch (error) {
    console.error("Document detection error:", error);
    return false;
  }
};
