# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pose Detection from Video is a web application that detects human poses from uploaded videos and generates animated 3D skeleton visualizations. The app uses MediaPipe for pose detection and Three.js for 3D rendering.

## Development Commands

### Essential Commands
```bash
# Start development server
npm run dev

# Type checking (no dedicated lint script exists)
tsc

# Format code
npm run format

# Build for production (GitHub Pages)
npm run build

# Build as single HTML file
npm run build-singlefile
```

## Architecture Overview

### Build Modes

The codebase supports two main build modes:

1. **Online Mode** (`--mode online`): Web application
   - Entry: `/src/entry.ts` → `/src/environments/online/main.tsx`
   - Includes PWA support and service workers
   - Deployed to GitHub Pages

2. **Single File Mode** (`--mode singlefile`): Standalone HTML
   - All assets embedded inline
   - For offline distribution

### Core Architecture

The application focuses on video pose detection:
- Uses `BodyEditor` class for 3D scene management
- MediaPipe integration for real-time pose detection from video frames
- Three.js for rendering and animating the detected skeleton
- Minimal UI with video upload and playback controls

### Key Components

- `/src/environments/online/App.tsx` - Main app component with video upload and detection
- `/src/utils/detect.ts` - MediaPipe pose detection integration (supports both image and video)
- `/src/utils/video.ts` - Video loading utilities
- `/src/utils/BodyEditor.ts` - Three.js scene and skeleton management
- `/src/body.ts` - Skeleton structure and manipulation

## Project Structure

```
/src/
  /components/     - UI components (minimal usage)
  /environments/   
    /online/       - Web app code
  /utils/          - Core utilities
    /BodyEditor.ts - 3D scene management
    /detect.ts     - Pose detection
  /locales/        - i18n translations
/models/           - 3D models (hands, feet FBX files)
/tools/            - Build-time scripts
```

## Important Implementation Details

- The app automatically creates a skeleton when loaded
- Pose detection uses MediaPipe's Pose model for real-time video processing
- The uploaded video is displayed with playback controls
- Real-time skeleton animation synced with video frames
- Base path is `/open-pose-editor/` for production
- TypeScript strict mode is enabled
- No test suite currently exists

## Common Development Tasks

### Modifying the Detection Process
- Pose detection logic is in `/src/utils/detect.ts`
- Skeleton pose application is in `/src/utils/BodyEditor.ts` (SetBlazePose method)

### Updating Translations
- Add new text to all locale files in `/src/locales/`
- Currently supports: en, ja, zh, de, es