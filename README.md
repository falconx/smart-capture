# Smart Document Capture

A real-time document capture application that uses computer vision to ensure high-quality images of identity documents. The app automatically validates capture conditions including blur, lighting, glare, and document positioning before capturing the image.

## Features

### Real-Time Quality Validation

- **Blur Detection** - Ensures the document is in focus using Laplacian variance analysis
- **Lighting Check** - Validates proper brightness levels (not too dark, not overexposed)
- **Glare Detection** - Identifies reflective hotspots that obscure document details
- **Document-in-Frame** - Confirms a rectangular document is properly positioned within the capture area

### Smart Capture Modes

- **Auto-Capture** - Automatically takes the photo when all quality conditions are met (default)
- **Manual Capture** - User-controlled capture with quality indicators as guidance
- **Toggle Between Modes** - Switch between auto and manual capture on the fly

### User Feedback

- **Visual Indicators** - Color-coded status for each quality check (red = fail, green = pass)
- **Real-Time Updates** - Indicators update continuously as conditions change
- **Instant Preview** - Captured image displayed immediately for review

## Technology Stack

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library with hooks
- **[OpenCV.js 4.12.0](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)** - Computer vision library compiled to WebAssembly
- **TypeScript** - Type-safe JavaScript
- **HTML5 Canvas** - Image processing and rendering
- **MediaDevices API** - Camera access

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd id-check-smart-capture-opencv-react
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

5. Grant camera permissions when prompted

## Usage

1. **Position Your Document**
   - Place your document (passport, ID card, etc.) in front of the camera
   - Ensure good lighting without glare or shadows
   - Hold the camera steady to avoid blur

2. **Watch the Indicators**
   - **Blur** - Green when image is sharp and in focus
   - **Lighting** - Green when brightness is optimal
   - **Glare** - Green when no reflective hotspots detected
   - **inFrame** - Green when a rectangular document is detected in the frame

3. **Capture**
   - **Auto Mode (default)**: Photo captures automatically when all indicators are green
   - **Manual Mode**: Click "Manual capture" button when ready (indicators still provide guidance)

4. **Review**
   - Captured image appears below the camera view
   - Use for upload, verification, or further processing

## How Quality Checks Work

### Blur Detection

Uses the **Laplacian operator** to calculate image sharpness:

- Converts image to grayscale
- Applies Laplacian edge detection
- Calculates variance of the result
- **Threshold**: Variance > 100 = sharp image
- **Why**: Blurry images have low edge variance

### Lighting Check

Analyzes overall **brightness** using mean pixel intensity:

- Converts image to grayscale
- Calculates mean brightness value (0-255 scale)
- **Threshold**: 60 < mean < 200 = good lighting
- **Why**: Too dark (<60) or too bright (>200) obscures details

### Glare Detection

Identifies **reflective hotspots** using thresholding:

- Converts image to grayscale
- Applies binary threshold at 240 (near-white pixels)
- Counts percentage of bright pixels
- **Threshold**: <5% bright pixels = no significant glare
- **Why**: Glare creates large areas of overexposed white pixels

### Document-in-Frame Detection

Uses **contour detection** to find rectangular documents:

- Converts image to grayscale
- Applies Canny edge detection
- Finds contours (connected edges)
- Approximates contours to polygons
- Looks for 4-sided polygons (rectangles) above minimum size
- Validates rectangle is within the guide area
- **Why**: Ensures a document-shaped object is properly positioned

## Project Structure

```
├── public/
│   └── lib/opencv/4.12.0/
│       └── opencv.js              # OpenCV.js library (WebAssembly)
├── src/
│   ├── app/
│   │   ├── page.tsx               # Main capture component
│   │   ├── page.module.css        # Component styles
│   │   ├── utilts.ts              # Quality check functions
│   │   ├── globals.css            # Global styles
│   │   └── layout.tsx             # App layout
│   └── types/
│       └── opencv.d.ts            # TypeScript definitions for OpenCV
├── package.json
└── README.md
```

## Configuration

### Quality Thresholds

You can adjust quality thresholds in `src/app/utils.ts`:

```typescript
// Blur threshold (higher = stricter)
return variance > 100;

// Lighting range (0-255 scale)
return mean[0] > 60 && mean[0] < 200;

// Glare threshold (percentage of bright pixels)
return white / total > 0.05;

// Document size threshold (pixels)
if (approx.rows === 4 && cv.contourArea(approx) > 5000)
```
