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

export const checkDocumentInFrame = (src, guideX, guideY, guideW, guideH) => {
  const roiRect = new cv.Rect(guideX, guideY, guideW, guideH);

  const roi = src.roi(roiRect);

  const gray = new cv.Mat();
  cv.cvtColor(roi, gray, cv.COLOR_RGBA2GRAY);

  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

  const thresh = new cv.Mat();

  cv.adaptiveThreshold(
    blurred,
    thresh,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY,
    11,
    2,
  );

  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));

  cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, kernel);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  cv.findContours(
    thresh,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE,
  );

  let bestScore = 0;

  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);

    if (area < 5000) {
      continue;
    }

    const approx = new cv.Mat();

    cv.approxPolyDP(cnt, approx, 0.02 * cv.arcLength(cnt, true), true);

    if (approx.rows < 4 || approx.rows > 8) {
      approx.delete();
      continue;
    }

    const rect = cv.boundingRect(approx);
    const aspect = rect.width / rect.height;
    const boundingArea = rect.width * rect.height;
    const rectangularity = area / boundingArea;

    let score = 0;

    if (aspect > 1.2 && aspect < 1.7) {
      score += 3;
    }

    if (rectangularity > 0.7) {
      score += 3;
    }

    if (area > 12000) {
      score += 2;
    }

    bestScore = Math.max(bestScore, score);
    approx.delete();
  }

  gray.delete();
  blurred.delete();
  thresh.delete();
  contours.delete();
  hierarchy.delete();
  roi.delete();

  return bestScore >= 6;
};
