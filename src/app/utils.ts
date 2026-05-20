// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

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

  return variance > 100;
};

export const checkLighting = (src) => {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const mean = cv.mean(gray);
  gray.delete();

  return mean[0] > 60 && mean[0] < 200;
};

export const checkGlare = (src) => {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const thresh = new cv.Mat();
  cv.threshold(gray, thresh, 240, 255, cv.THRESH_BINARY);

  const white = cv.countNonZero(thresh);
  const total = gray.rows * gray.cols;
  gray.delete();
  thresh.delete();

  return white / total > 0.05;
};

export const checkDocumentInFrame = (
  src,
  guideX: number,
  guideY: number,
  guideW: number,
  guideH: number,
) => {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const edges = new cv.Mat();
  cv.Canny(gray, edges, 50, 150);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(
    edges,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE,
  );

  let found = false;
  const minArea = 3000; // Reduced from 5000 to be less strict

  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);

    // Skip small contours
    if (area < minArea) {
      continue;
    }

    const approx = new cv.Mat();
    const epsilon = 0.02 * cv.arcLength(cnt, true);
    cv.approxPolyDP(cnt, approx, epsilon, true);

    // Look for 4-sided polygons (rectangles)
    if (approx.rows === 4) {
      const rect = cv.boundingRect(approx);

      // Check if rectangle is within guide bounds with some tolerance
      const tolerance = 20;
      if (
        rect.x >= guideX - tolerance &&
        rect.y >= guideY - tolerance &&
        rect.x + rect.width <= guideX + guideW + tolerance &&
        rect.y + rect.height <= guideY + guideH + tolerance
      ) {
        found = true;
        approx.delete();
        break;
      }
    }

    approx.delete();
  }

  gray.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();
  return found;
};
