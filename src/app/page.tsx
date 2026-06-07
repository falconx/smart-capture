"use client";

import { FC, useEffect, useRef, useState } from "react";
import Script from "next/script";
import styles from "./page.module.css";
import {
  checkBlur,
  checkLighting,
  checkGlare,
  checkDocumentInFrame,
} from "./utils";
import { DocumentDetector } from "./yolo-detector";
import {
  REQUIRED_STABLE_FRAMES,
  MIN_CAPTURE_INTERVAL_MS,
  INITIAL_COUNTDOWN_SECONDS,
} from "../constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const cv: any;

enum Status {
  Initialising,
  CapturingFront,
  CapturedFront,
}

type Indicator = {
  name: string;
  value: boolean;
};

const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <defs>
    <style>
      .guide-rect { stroke: rgba(0, 255, 0, 0.5); stroke-width: 2; fill: none; stroke-dasharray: 10, 5; }
    </style>
  </defs>
  <rect x="40" y="90" width="560" height="300" class="guide-rect" rx="8" />
</svg>
`;

const IdentityUpload: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const overlayImageRef = useRef<HTMLImageElement | null>(null);
  const [status, setStatus] = useState(Status.Initialising);
  const [capturedImage, setCapturedImage] = useState<string>();
  const [error, setError] = useState<string>();
  const streamingRef = useRef(false);
  const [enableAutoCapture, setEnableAutoCapture] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isFrontCamera, setIsFrontCamera] = useState(false);

  const [isSharp, setIsSharp] = useState(false);
  const [hasGlare, setHasGlare] = useState(false);
  const [hasGoodLighting, setHasGoodLighting] = useState(false);
  const [isDocumentInFrame, setIsDocumentInFrame] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownComplete, setCountdownComplete] = useState(false);
  const lastCaptureAttemptRef = useRef<number>(0);
  const detectorRef = useRef<DocumentDetector | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [consecutiveGoodFrames, setConsecutiveGoodFrames] = useState(0);
  const cameraReadyRef = useRef(false);
  const modelReadyRef = useRef(false);
  const countdownStartedRef = useRef(false);

  console.log("isModelLoading", isModelLoading);
  console.log("countdown", countdown);
  console.log("countdownComplete", countdownComplete);

  // Enumerate available cameras
  useEffect(() => {
    const enumerateCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          ({ kind }) => kind === "videoinput",
        );

        console.log("videoDevices", videoDevices);
        console.log("selectedCameraId before", selectedCameraId);

        setAvailableCameras(videoDevices);

        if (!selectedCameraId) {
          console.log("no selectedCameraId");
          return;
        }

        // Set default camera (prefer rear camera on mobile)
        if (videoDevices.length > 0 && !selectedCameraId) {
          const rearCamera = videoDevices.find(({ label }) =>
            label.toLowerCase().includes("back"),
          );

          setSelectedCameraId(rearCamera?.deviceId || videoDevices[0].deviceId);

          console.log(
            "setting camera",
            rearCamera?.deviceId || videoDevices[0].deviceId,
          );
        }
      } catch (err) {
        console.error("Error enumerating cameras:", err);
      }
    };

    enumerateCameras();
  }, [selectedCameraId]);

  // Initialize YOLO detector
  useEffect(() => {
    const initDetector = async () => {
      console.log("initDetector");

      try {
        setIsModelLoading(true);
        const detector = new DocumentDetector();
        await detector.initialize();
        detectorRef.current = detector;
        setIsModelLoading(false);

        // Mark model as ready and try to start countdown
        modelReadyRef.current = true;
        tryStartCountdown();
      } catch (error) {
        console.error("Failed to initialize document detector:", error);
        setError("Failed to load document detection model");
        setIsModelLoading(false);
      }
    };

    initDetector();
  }, []);

  // Create overlay image once on mount
  useEffect(() => {
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      overlayImageRef.current = img;
      URL.revokeObjectURL(url);
    };
    img.onerror = (e) => {
      console.error("Failed to load SVG overlay image", e);
      URL.revokeObjectURL(url);
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, []);

  // Initialize camera with error handling
  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera access is not supported in this browser");
      return;
    }

    // Don't start camera until we have a selected camera ID
    if (!selectedCameraId) return;

    // Stop existing stream before starting new one
    if (video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }

    // Request camera with specific device ID
    const constraints: MediaStreamConstraints = {
      video: selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : true,
    };
    console.log("calling getUserMedia");

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        console.log("getUserMedia success");
        video.srcObject = stream;
        setError(undefined);

        // Detect if this is a front-facing camera
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const facingMode = settings.facingMode;

        // Check if it's a front camera by facingMode or label
        const selectedCamera = availableCameras.find(
          (cam) => cam.deviceId === selectedCameraId,
        );

        const label = selectedCamera?.label.toLowerCase() || "";
        const isFront =
          facingMode === "user" ||
          label.includes("front") ||
          label.includes("user") ||
          label.includes("facetime") ||
          (!label.includes("back") &&
            !label.includes("rear") &&
            !label.includes("environment"));

        setIsFrontCamera(!!isFront);

        // Mark camera as ready and try to start countdown
        console.log("getUserMedia success");
        cameraReadyRef.current = true;
        tryStartCountdown();
      })
      .catch((err) => {
        console.error("Camera access error:", err);

        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setError(
            "Camera permission denied. Please allow camera access to continue.",
          );
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          setError("No camera found on this device.");
        } else {
          setError(
            "Unable to access camera. Please check your device settings.",
          );
        }
      });

    // Cleanup: Stop camera stream on unmount
    return () => {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedCameraId]);

  const capture = () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    // Prevent capture if already captured
    if (capturedImage) return;

    // Throttle capture calls to prevent rapid successive captures
    const now = Date.now();
    const timeSinceLastCapture = now - lastCaptureAttemptRef.current;

    // Require at least MIN_CAPTURE_INTERVAL_MS between capture attempts
    if (timeSinceLastCapture < MIN_CAPTURE_INTERVAL_MS) return;

    lastCaptureAttemptRef.current = now;

    // Stop streaming immediately to prevent further captures
    streamingRef.current = false;

    // Reset the consecutive frames counter
    setConsecutiveGoodFrames(0);

    const base64 = canvas.toDataURL("image/jpeg");
    setCapturedImage(base64);
    setStatus(Status.CapturedFront);
  };

  const retake = () => {
    setCapturedImage(undefined);
    setStatus(Status.CapturingFront);
    // Reset the last capture timestamp to allow immediate capture if needed
    lastCaptureAttemptRef.current = 0;
    setConsecutiveGoodFrames(0);
    streamingRef.current = true;

    // Use setTimeout to ensure the DOM has updated before restarting
    setTimeout(() => {
      const video = videoRef.current;

      if (video && video.readyState >= 2) {
        start();
      }
    }, 0);
  };

  // Deterministic countdown trigger - called when both camera and model are ready
  const tryStartCountdown = () => {
    console.log("tryStartCountdown", {
      cameraReady: cameraReadyRef.current,
      modelReady: modelReadyRef.current,
      countdownStarted: countdownStartedRef.current,
    });

    if (
      countdownStartedRef.current ||
      capturedImage ||
      countdown !== null ||
      countdownComplete
    ) {
      return;
    }

    if (cameraReadyRef.current && modelReadyRef.current) {
      console.log("start coundown");

      countdownStartedRef.current = true;
      setCountdown(INITIAL_COUNTDOWN_SECONDS);
    }
  };

  const onVideoReady = () => {
    console.log("video loaded", { countdown, countdownComplete });

    if (countdown === null && !countdownComplete) {
      setCountdown(INITIAL_COUNTDOWN_SECONDS);
    }
  };

  const start = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;

    console.log("start", { video, canvas, overlay });

    if (!video || !canvas || !overlay) return;

    const ctx = canvas.getContext("2d");
    const overlayCtx = overlay.getContext("2d");

    if (!ctx || !overlayCtx) return;

    const processFrame = async () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw overlay guide if image is loaded
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;

      if (overlayImageRef.current) {
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        overlayCtx.drawImage(
          overlayImageRef.current,
          0,
          0,
          overlay.width,
          overlay.height,
        );
      }

      // Check if OpenCV is loaded
      if (typeof cv === "undefined" || !cv.imread) return;

      const src = cv.imread(canvas);

      // Check document in frame using YOLO detector
      const docInFrame = await checkDocumentInFrame(
        canvas,
        detectorRef.current,
      );

      const quality = {
        isSharp: checkBlur(src),
        hasGoodLighting: checkLighting(src),
        hasGlare: checkGlare(src),
        isDocumentInFrame: docInFrame,
      };

      setIsSharp(quality.isSharp);
      setHasGoodLighting(quality.hasGoodLighting);
      setHasGlare(quality.hasGlare);
      setIsDocumentInFrame(quality.isDocumentInFrame);

      const checksPass =
        quality.isSharp &&
        quality.hasGoodLighting &&
        !quality.hasGlare &&
        quality.isDocumentInFrame;

      // Track consecutive good frames for stability
      if (checksPass) {
        setConsecutiveGoodFrames((prev) => {
          const newCount = prev + 1;

          // Trigger capture when we reach the required frames
          if (newCount >= REQUIRED_STABLE_FRAMES && enableAutoCapture) {
            capture();
          }

          return newCount;
        });
      } else {
        setConsecutiveGoodFrames(0);
      }

      src.delete();
    };

    const runChecks = () => {
      streamingRef.current = true;

      if (typeof cv === "undefined" || !cv.imread) {
        requestAnimationFrame(runChecks);
        return;
      }

      if (!streamingRef.current) return;

      requestAnimationFrame(runChecks);
      processFrame();
    };

    setStatus(Status.CapturingFront);
    runChecks();
  };

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null || isModelLoading) return;

    // Delay start to avoid lag but start just before the countdown finishes
    // to account for render delay
    if (countdown === 1) {
      start();
    }

    if (countdown === 0) {
      setCountdown(null);
      setCountdownComplete(true);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, isModelLoading]);

  const indicators: Indicator[] = [
    { name: "Sharp", value: isSharp },
    { name: "Good Lighting", value: hasGoodLighting },
    { name: "No Glare", value: !hasGlare },
    { name: "In Frame", value: isDocumentInFrame },
  ];

  const isInitialising = status === Status.Initialising;

  return (
    <>
      <Script
        src="/lib/opencv/4.12.0/opencv.js"
        strategy="beforeInteractive"
        onError={() => setError("Failed to load OpenCV library")}
      />

      <header className={styles.header}>
        <h1 className={styles.title}>Smart Document Capture</h1>
        <p className={styles.subtitle}>
          Position your document within the guide for automatic capture
        </p>
      </header>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      <div
        className={styles.container}
        style={{ display: capturedImage ? "none" : "block" }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`${styles.video} ${isFrontCamera ? styles.videoMirrored : ""}`}
          onLoadedData={onVideoReady}
        />
        <canvas ref={canvasRef} className={styles.canvas} />
        <canvas ref={overlayRef} className={styles.overlay} />

        {countdown !== null && countdown > 0 && (
          <div className={styles.countdownOverlay}>
            <div className={styles.countdownNumber}>{countdown}</div>
          </div>
        )}

        {status !== Status.Initialising && !capturedImage && (
          <ul className={styles.indicators}>
            {indicators.map(({ name, value }) => (
              <li
                key={name}
                className={[
                  styles.indicator,
                  value ? styles.indicatorGood : undefined,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {name}
              </li>
            ))}
          </ul>
        )}

        {!capturedImage && consecutiveGoodFrames > 0 && (
          <div className={styles.stabilityIndicator}>
            <div className={styles.stabilityProgress}>
              <div
                className={styles.stabilityBar}
                key={consecutiveGoodFrames}
                style={{
                  width: `${(consecutiveGoodFrames / REQUIRED_STABLE_FRAMES) * 100}%`,
                }}
              />
            </div>
            <p className={styles.stabilityText}>
              Hold steady... {consecutiveGoodFrames}/{REQUIRED_STABLE_FRAMES}
            </p>
          </div>
        )}
      </div>

      {(status === Status.Initialising || isModelLoading) && !error && (
        <p className={styles.loading}>
          {isModelLoading
            ? "Loading document detection model..."
            : "Loading camera and computer vision..."}
        </p>
      )}

      {capturedImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={`${styles.capturedImage} ${isFrontCamera ? styles.capturedImageMirrored : ""}`}
            src={capturedImage}
            alt="captured image"
          />
        </>
      )}

      {!isInitialising && (
        <div className={styles.captureControls}>
          {!capturedImage ? (
            <>
              <label className={styles.cameraSelector}>
                {/* Camera */}
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                >
                  {availableCameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" onClick={capture}>
                Manual capture
              </button>

              <label className={styles.autoCapture}>
                Enable auto capture
                <input
                  type="checkbox"
                  checked={enableAutoCapture}
                  onChange={(e) => setEnableAutoCapture(e.target.checked)}
                />
              </label>
            </>
          ) : (
            <>
              <button type="button" onClick={retake}>
                Retake
              </button>
              <button type="button" onClick={() => alert("Image accepted!")}>
                Use this photo
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default IdentityUpload;
