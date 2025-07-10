# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open Pose Editor is a 3D pose editing tool for AI art creation. It's a React web application that allows users to manipulate 3D human models to create reference poses for AI art workflows. The project is deployed at https://zhuyu1997.github.io/open-pose-editor/ and can also be built as a single HTML file for offline use.

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

### Build Modes and Entry Points

The codebase supports two main build modes:

1. **Online Mode** (`--mode online`): Web application
   - Entry: `/src/entry.ts` → `/src/environments/online/main.tsx`
   - Includes PWA support and service workers
   - Deployed to GitHub Pages

2. **Single File Mode** (`--mode singlefile`): Standalone HTML
   - All assets embedded inline
   - For offline distribution

### Core Architecture

The application centers around the `BodyEditor` class which manages:
- Three.js scene with skeletal pose system
- 18-point OpenPose skeleton hierarchy
- Hand and foot models (loaded from FBX files in `/models/`)
- Multiple rendering modes (pose, depth, normal, canny edge)
- IK solver for natural joint movements

### Key Patterns

1. **Event System**: Uses custom `EditorEventManager<T>` for decoupled communication
2. **Command Pattern**: All transformations support undo/redo
3. **Environment Switching**: Vite aliases redirect imports based on build mode

### State Management

- Local React state for UI components
- Central `BodyEditor` instance for 3D scene state
- Event-driven communication between components
- No global state management library

## Project Structure

```
/src/
  /components/     - UI components (React + Radix UI)
  /environments/   - Build mode specific implementations
    /online/       - Web app specific code
  /utils/          - Core utilities
    /BodyEditor.ts - Main 3D scene management
    /CCDIKSolver.ts - Inverse kinematics
  /poses/          - Pre-defined pose templates
  /locales/        - i18n translations (en, ja, zh, de, es)
/models/           - 3D models (hands, feet FBX files)
/tools/            - Build-time scripts
```

## Important Implementation Details

- Uses MediaPipe for pose detection from images
- Implements CCD IK solver for joint constraints
- Supports offline caching of external resources
- Base path is `/open-pose-editor/` for production
- TypeScript strict mode is enabled
- No test suite currently exists

## Common Development Tasks

### Adding a New Feature
1. Implement in the core `BodyEditor` or relevant component
2. Add translations to `/src/locales/` if UI text is involved
3. Test in both development and production builds

### Modifying 3D Rendering
- Main rendering logic is in `/src/utils/BodyEditor.ts`
- Post-processing effects in `/src/utils/ThreeUtils.ts`
- Model loading in `/src/utils/LoadingManager.ts`