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

  const [isSharp, setIsSharp] = useState(false);
  const [hasGlare, setHasGlare] = useState(false);
  const [hasGoodLighting, setHasGoodLighting] = useState(false);
  const [isDocumentInFrame, setIsDocumentInFrame] = useState(false);

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

    // Request camera with rear camera preference for mobile
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
      })
      .then((stream) => {
        video.srcObject = stream;
        setError(undefined);
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
  }, []);

  const capture = () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const base64 = canvas.toDataURL("image/jpeg");
    setCapturedImage(base64);
    setStatus(Status.CapturedFront);
    streamingRef.current = false;
  };

  const retake = () => {
    setCapturedImage(undefined);
    setStatus(Status.CapturingFront);
    streamingRef.current = true;

    // Restart the video processing
    const video = videoRef.current;
    if (video && video.readyState >= 2) {
      onLoadedData();
    }
  };

  const onLoadedData = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;

    if (!video || !canvas || !overlay) return;

    const ctx = canvas.getContext("2d");
    const overlayCtx = overlay.getContext("2d");

    if (!ctx || !overlayCtx) return;

    const processFrame = () => {
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

      // Calculate guide box dimensions
      const boxMargin = 40;
      const boxWidth = canvas.width - boxMargin * 2;
      const boxHeight = boxWidth / 1.58;
      const boxX = boxMargin;
      const boxY = (canvas.height - boxHeight) / 2;

      // Check if OpenCV is loaded
      if (typeof cv === "undefined" || !cv.imread) {
        return;
      }

      const src = cv.imread(canvas);

      const quality = {
        isSharp: checkBlur(src),
        hasGoodLighting: checkLighting(src),
        hasGlare: checkGlare(src),
        isDocumentInFrame: checkDocumentInFrame(
          src,
          boxX,
          boxY,
          boxWidth,
          boxHeight,
        ),
      };

      setIsSharp(quality.isSharp);
      setHasGoodLighting(quality.hasGoodLighting);
      setHasGlare(quality.hasGlare);
      setIsDocumentInFrame(quality.isDocumentInFrame);

      const pass =
        quality.isSharp &&
        quality.hasGoodLighting &&
        !quality.hasGlare &&
        quality.isDocumentInFrame;

      setStatus(Status.CapturingFront);

      if (pass && enableAutoCapture) {
        capture();
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

      processFrame();
      requestAnimationFrame(runChecks);
    };

    runChecks();
  };

  const indicators: Indicator[] = [
    { name: "Sharp", value: isSharp },
    { name: "Good Lighting", value: hasGoodLighting },
    { name: "No Glare", value: !hasGlare },
    { name: "In Frame", value: isDocumentInFrame },
  ];

  return (
    <>
      <Script
        src="/lib/opencv/4.12.0/opencv.js"
        strategy="beforeInteractive"
        onError={() => setError("Failed to load OpenCV library")}
      />

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      <div className={styles.container}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={styles.video}
          onLoadedData={onLoadedData}
        />
        <canvas ref={canvasRef} className={styles.canvas} />
        <canvas ref={overlayRef} className={styles.overlay} />
      </div>

      {status === Status.Initialising && !error && <p>Loading...</p>}

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

      {capturedImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.capturedImage}
            src={capturedImage}
            alt="captured image"
          />
        </>
      )}

      <div className={styles.captureControls}>
        {!capturedImage ? (
          <>
            <button type="button" onClick={capture}>
              Manual capture
            </button>

            <label>
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
    </>
  );
};

export default IdentityUpload;
