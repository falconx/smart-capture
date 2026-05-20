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
  guideH: number
) => {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const edges = new cv.Mat();
  cv.Canny(gray, edges, 75, 200);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(
    edges,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE
  );

  let found = false;

  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    const approx = new cv.Mat();
    cv.approxPolyDP(cnt, approx, 0.02 * cv.arcLength(cnt, true), true);

    if (approx.rows === 4 && cv.contourArea(approx) > 5000) {
      const rect = cv.boundingRect(approx);

      if (
        rect.x > guideX &&
        rect.y > guideY &&
        rect.x + rect.width < guideX + guideW &&
        rect.y + rect.height < guideY + guideH
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
