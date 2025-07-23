import { PoseLandmarker, FilesetResolver, PoseLandmarkerResult } from '@mediapipe/tasks-vision'

let poseLandmarker: PoseLandmarker | null = null
let isInitialized = false

export async function initializePoseLandmarker() {
    if (isInitialized) return

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    )

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "/open-pose-editor/models/pose_landmarker_heavy.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false
    })

    isInitialized = true
}

export async function DetectPosefromImage(image: HTMLImageElement): Promise<PoseLandmarkerResult> {
    if (!poseLandmarker) {
        await initializePoseLandmarker()
    }

    // Switch to IMAGE mode for single image
    await poseLandmarker!.setOptions({ runningMode: "IMAGE" })

    const result = poseLandmarker!.detect(image)

    // Switch back to VIDEO mode
    await poseLandmarker!.setOptions({ runningMode: "VIDEO" })

    return result
}

export function DetectPoseFromVideo(
    video: HTMLVideoElement,
    onFrame: (results: PoseLandmarkerResult) => void,
    onComplete: () => void
): { stop: () => void } {
    let isRunning = true
    let animationFrameId: number | null = null
    let lastVideoTime = -1

    const renderLoop = async () => {
        if (!isRunning) {
            return
        }

        // Check if video has ended
        if (video.ended) {
            onComplete()
            return
        }

        // Only process if video time has changed and video is playing
        if (video.currentTime !== lastVideoTime && !video.paused && video.currentTime > 0) {
            if (!poseLandmarker) {
                await initializePoseLandmarker()
            }

            try {
                const results = poseLandmarker!.detectForVideo(video, performance.now())
                onFrame(results)
                lastVideoTime = video.currentTime
            } catch (error) {
                console.error('Error processing video frame:', error)
            }
        }

        animationFrameId = requestAnimationFrame(renderLoop)
    }

    // Start the render loop
    renderLoop()

    return {
        stop: () => {
            isRunning = false
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId)
                animationFrameId = null
            }
        }
    }
}

// Convert PoseLandmarkerResult to the format expected by BodyEditor
export function convertToWorldLandmarks(result: PoseLandmarkerResult): [number, number, number][] | null {
    if (!result.worldLandmarks || result.worldLandmarks.length === 0) {
        return null
    }

    // Get the first pose's world landmarks
    const landmarks = result.worldLandmarks[0]

    // Convert to the format expected by SetBlazePose
    // MediaPipe uses meters, but we need to scale it up
    return landmarks.map(landmark => [
        landmark.x * 100,
        -landmark.y * 100,  // Flip Y axis
        -landmark.z * 100   // Flip Z axis
    ])
}