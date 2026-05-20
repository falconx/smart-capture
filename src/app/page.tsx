"use client";

import { FC, useEffect, useRef, useState } from "react";
import Script from "next/script";
import styles from "./page.module.css";
import {
  checkBlur,
  checkLighting,
  checkGlare,
  checkDocumentInFrame,
} from "./utilts";

enum Status {
  Initialising,
  CapturingFront,
  CapturedFront,
}

type Indicator = {
  name: string;
  value: boolean;
};

// const svgString = `<svg width="300" height="190" viewBox="0 0 300 190" fill="none" xmlns="http://www.w3.org/2000/svg">
// <path d="M290.515 0.0126953C295.798 0.280548 300 4.64976 300 10V180C300 180.283 299.985 180.564 299.962 180.841C299.957 180.895 299.955 180.948 299.949 181.002C299.942 181.071 299.933 181.14 299.925 181.209C299.913 181.304 299.903 181.398 299.889 181.492C299.879 181.557 299.866 181.621 299.855 181.685C299.838 181.787 299.821 181.89 299.801 181.991C299.786 182.064 299.768 182.137 299.752 182.209C299.734 182.29 299.717 182.371 299.696 182.451C299.673 182.545 299.645 182.638 299.619 182.73C299.601 182.793 299.584 182.857 299.565 182.919C299.546 182.983 299.525 183.047 299.504 183.111C299.474 183.203 299.444 183.295 299.411 183.386C299.385 183.459 299.356 183.531 299.328 183.604C299.298 183.682 299.267 183.761 299.234 183.839C299.208 183.903 299.179 183.965 299.151 184.028C299.114 184.113 299.077 184.198 299.037 184.281C299.012 184.335 298.985 184.388 298.959 184.441C298.915 184.529 298.871 184.616 298.825 184.702C298.791 184.765 298.757 184.828 298.722 184.891C298.68 184.965 298.637 185.039 298.594 185.112C298.552 185.183 298.508 185.253 298.464 185.322C298.424 185.386 298.383 185.45 298.342 185.513C298.298 185.578 298.254 185.643 298.209 185.707C298.169 185.764 298.13 185.822 298.089 185.878C298.033 185.955 297.975 186.03 297.917 186.105C297.875 186.159 297.834 186.213 297.791 186.266C297.737 186.332 297.682 186.398 297.627 186.464C297.577 186.522 297.527 186.58 297.476 186.638C297.422 186.698 297.368 186.758 297.313 186.816C297.264 186.869 297.215 186.922 297.164 186.974C297.105 187.034 297.045 187.094 296.984 187.153C296.927 187.21 296.869 187.265 296.81 187.32C296.758 187.368 296.706 187.415 296.653 187.462C296.589 187.52 296.523 187.577 296.457 187.633C296.399 187.682 296.341 187.73 296.282 187.777C296.221 187.827 296.159 187.876 296.097 187.924C296.034 187.972 295.972 188.02 295.908 188.066C295.839 188.117 295.769 188.166 295.698 188.215C295.642 188.254 295.586 188.293 295.529 188.331C295.46 188.377 295.391 188.422 295.32 188.466C295.252 188.509 295.183 188.551 295.113 188.593C295.043 188.635 294.972 188.675 294.901 188.715C294.839 188.75 294.777 188.786 294.714 188.819C294.624 188.868 294.532 188.913 294.44 188.959C294.393 188.982 294.346 189.007 294.299 189.029C294.196 189.078 294.092 189.124 293.987 189.17C293.946 189.188 293.904 189.208 293.862 189.226C293.769 189.265 293.674 189.301 293.579 189.337C293.517 189.361 293.456 189.386 293.394 189.408C293.313 189.437 293.232 189.463 293.15 189.49C293.079 189.514 293.008 189.539 292.937 189.561C292.839 189.591 292.74 189.617 292.641 189.645C292.587 189.659 292.534 189.676 292.479 189.689C292.357 189.721 292.233 189.748 292.108 189.774C292.073 189.782 292.039 189.792 292.004 189.799C291.873 189.825 291.741 189.848 291.608 189.869C291.577 189.874 291.545 189.881 291.514 189.886C291.186 189.936 290.852 189.97 290.515 189.987L290 190H10C9.7164 190 9.43582 189.985 9.1582 189.962C9.10442 189.957 9.05061 189.955 8.99707 189.949C8.91858 189.941 8.84064 189.931 8.7627 189.921C8.67488 189.91 8.5871 189.901 8.5 189.888C8.43782 189.878 8.37625 189.866 8.31445 189.855C8.21182 189.838 8.10936 189.821 8.00781 189.801C7.93476 189.786 7.8625 189.768 7.79004 189.752C7.70908 189.734 7.62805 189.717 7.54785 189.696C7.454 189.673 7.36133 189.645 7.26855 189.619C7.20562 189.601 7.14251 189.584 7.08008 189.565C6.99811 189.54 6.91699 189.513 6.83594 189.486C6.76152 189.462 6.68691 189.438 6.61328 189.411C6.54009 189.385 6.4679 189.356 6.39551 189.328C6.31664 189.298 6.23805 189.267 6.16016 189.234C6.09643 189.208 6.03375 189.179 5.9707 189.151C5.88594 189.114 5.80129 189.077 5.71777 189.037C5.65643 189.008 5.59581 188.978 5.53516 188.947C5.45524 188.907 5.37555 188.867 5.29688 188.825C5.2336 188.791 5.17086 188.757 5.1084 188.722C5.03396 188.68 4.95996 188.637 4.88672 188.594C4.81598 188.552 4.74636 188.508 4.67676 188.464C4.61292 188.424 4.54918 188.383 4.48633 188.342C4.42087 188.298 4.35636 188.254 4.29199 188.209C4.22911 188.165 4.16631 188.121 4.10449 188.076C4.03335 188.024 3.96326 187.971 3.89355 187.917C3.83978 187.875 3.7863 187.834 3.7334 187.791C3.66656 187.737 3.60056 187.682 3.53516 187.627C3.47655 187.577 3.41877 187.527 3.36133 187.476C3.30119 187.422 3.24144 187.368 3.18262 187.313C3.12973 187.264 3.0772 187.215 3.02539 187.164C2.96469 187.105 2.90489 187.045 2.8457 186.984C2.7894 186.927 2.73362 186.869 2.67871 186.81C2.63082 186.758 2.58392 186.706 2.53711 186.653C2.47935 186.589 2.4223 186.523 2.36621 186.457C2.31735 186.399 2.26924 186.341 2.22168 186.282C2.17213 186.221 2.12332 186.159 2.0752 186.097C2.02712 186.034 1.97924 185.972 1.93262 185.908C1.88193 185.839 1.83312 185.769 1.78418 185.698C1.74503 185.642 1.70598 185.585 1.66797 185.528C1.62234 185.46 1.57815 185.39 1.53418 185.32C1.49096 185.252 1.44783 185.183 1.40625 185.113C1.36451 185.043 1.32424 184.972 1.28418 184.901C1.24907 184.839 1.21349 184.777 1.17969 184.714C1.1314 184.624 1.08561 184.532 1.04004 184.44C1.01661 184.393 0.992427 184.346 0.969727 184.299C0.920733 184.196 0.874657 184.092 0.829102 183.987C0.810904 183.946 0.791078 183.904 0.773438 183.862C0.734274 183.769 0.698492 183.674 0.662109 183.579C0.638404 183.517 0.613327 183.456 0.59082 183.394C0.557192 183.3 0.527007 183.206 0.496094 183.111C0.477034 183.053 0.456489 182.995 0.438477 182.937C0.404511 182.826 0.373938 182.714 0.34375 182.602C0.332793 182.561 0.320023 182.52 0.30957 182.479C0.278277 182.357 0.25132 182.233 0.224609 182.108C0.21711 182.073 0.207329 182.039 0.200195 182.004C0.101626 181.519 0.0384118 181.022 0.0126953 180.515L0 180V10C0 4.47715 4.47715 2.81862e-07 10 0H290L290.515 0.0126953ZM10 4C6.68629 4 4 6.68629 4 10V140H296V10C296 6.6863 293.314 4 290 4H10Z" fill="black"/>
// </svg>`;

const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
  <rect x="10" y="10" width="180" height="80" stroke="lime" stroke-width="3" fill="none" />
  <text x="100" y="50" fill="lime" font-size="20" text-anchor="middle" dominant-baseline="middle">
    Passport Guide
  </text>
</svg>
`;

const IdentityUpload: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState(Status.Initialising);
  const [capturedImage, setCapturedImage] = useState<string>();
  const streamingRef = useRef(false);
  const [enableAutoCapture, setEnableAutoCapture] = useState(true);

  const [blur, setBlur] = useState(false);
  const [glare, setGlare] = useState(false);
  const [lighting, setLighting] = useState(false);
  const [inFrame, setInframe] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      video.srcObject = stream;
    });
  }, []);

  const capture = () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const base64 = canvas.toDataURL("image/jpeg");
    setCapturedImage(base64);
    setStatus(Status.CapturedFront);
    streamingRef.current = false;
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

      // overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

      // draw alignment box
      const boxMargin = 40;
      const boxWidth = canvas.width - boxMargin * 2;
      const boxHeight = boxWidth / 1.58;
      const boxX = boxMargin;
      const boxY = (canvas.height - boxHeight) / 2;

      // overlayCtx.strokeStyle = "lime";
      // overlayCtx.lineWidth = 3;
      // overlayCtx.setLineDash([10, 6]);
      // overlayCtx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      // overlayCtx.setLineDash([]);

      overlay.width = 640;
      overlay.height = 480;

      // Convert SVG string to Blob URL
      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        console.log("img.onload");

        ctx.clearRect(0, 0, overlay.width, overlay.height);
        ctx.drawImage(img, 0, 0, overlay.width, overlay.height);
        URL.revokeObjectURL(url);
      };
      img.onerror = (e) => {
        console.error("Failed to load SVG image", e);
        URL.revokeObjectURL(url);
      };
      img.src = url;

      // [end]

      const src = cv.imread(canvas);

      const quality = {
        blur: checkBlur(src),
        lighting: checkLighting(src),
        glare: checkGlare(src),
        inFrame: checkDocumentInFrame(src, boxX, boxY, boxWidth, boxHeight),
      };

      setBlur(quality.blur);
      setLighting(quality.lighting);
      setGlare(quality.glare);
      setInframe(quality.inFrame);

      const pass =
        quality.blur && quality.lighting && !quality.glare && quality.inFrame;

      setStatus(Status.CapturingFront);

      if (pass && enableAutoCapture) {
        capture();
      }

      src.delete();

      return () => {
        URL.revokeObjectURL(url);
      };
    };

    const runChecks = () => {
      streamingRef.current = true;
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;

      if (!streamingRef.current || typeof cv === "undefined" || !cv.imread) {
        requestAnimationFrame(runChecks);
        return;
      }

      processFrame();
      requestAnimationFrame(runChecks);
    };

    runChecks();
  };

  const indicators: Indicator[] = [
    { name: "Blur", value: blur },
    { name: "Lighting", value: lighting },
    { name: "Glare", value: glare },
    { name: "inFrame", value: inFrame },
  ];

  return (
    <>
      <Script src="/lib/opencv/4.12.0/opencv.js" strategy="beforeInteractive" />

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

      {status === Status.Initialising && <p>Loading...</p>}

      {status !== Status.Initialising && (
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
      </div>
    </>
  );
};

export default IdentityUpload;
