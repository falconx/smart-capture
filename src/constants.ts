/**
 * How many frames must all the conditions be met before auto capturing
 */
export const REQUIRED_STABLE_FRAMES = 6;

/**
 * Confidence needed for the model to identify an identification document (0-1)
 */
export const DOCUMENT_RECOGNITION_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Minimum variance threshold for blur detection using Laplacian
 * Higher values = sharper image required
 */
export const BLUR_VARIANCE_THRESHOLD = 100;

/**
 * Minimum acceptable mean brightness for good lighting (0-255)
 */
export const LIGHTING_MIN_THRESHOLD = 60;

/**
 * Maximum acceptable mean brightness for good lighting (0-255)
 */
export const LIGHTING_MAX_THRESHOLD = 200;

/**
 * Brightness threshold for detecting glare pixels (0-255)
 */
export const GLARE_BRIGHTNESS_THRESHOLD = 240;

/**
 * Maximum acceptable percentage of glare pixels (0-1)
 * e.g., 0.05 = 5% of image can be glare
 */
export const GLARE_PERCENTAGE_THRESHOLD = 0.05;

/**
 * YOLO model input size (width and height in pixels)
 */
export const YOLO_INPUT_SIZE = 640;

/**
 * IoU (Intersection over Union) threshold for non-max suppression
 * Lower values = more aggressive suppression of overlapping detections
 */
export const YOLO_IOU_THRESHOLD = 0.45;

/**
 * Minimum time interval between capture attempts in milliseconds
 */
export const MIN_CAPTURE_INTERVAL_MS = 500;

/**
 * Initial countdown duration in seconds before auto-capture is enabled
 */
export const INITIAL_COUNTDOWN_SECONDS = 3;
