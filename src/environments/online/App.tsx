import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadVideo } from '../../utils/transfer'
import classes from './App.module.css'
import { useBodyEditor } from '../../hooks'
import { DetectPoseFromVideo, initializePoseLandmarker, convertToWorldLandmarks } from '../../utils/detect'
import { getVideo } from '../../utils/video'
import { GetLoading } from '../../components/Loading'
import { ShowToast } from '../../components/Toast'
import { Oops } from '../../components/Oops'
import i18n from '../../i18n'
import { IsQQBrowser } from '../../utils/browser'


function App() {
    const canvasRef = useRef(null)
    const previewCanvasRef = useRef(null)
    const backgroundRef = useRef<HTMLDivElement>(null)
    const editor = useBodyEditor(canvasRef, previewCanvasRef, backgroundRef)
    const [isProcessing, setIsProcessing] = useState(false)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const detectProcessRef = useRef<{ stop: () => void } | null>(null)

    // Force canvas resize when container changes
    useEffect(() => {
        if (!editor || !backgroundRef.current) return

        // Force immediate resize on mount
        setTimeout(() => {
            editor.handleResize()
        }, 0)

        const resizeObserver = new ResizeObserver(() => {
            // Force the editor to update its size
            editor.handleResize()
        })

        resizeObserver.observe(backgroundRef.current)

        return () => {
            resizeObserver.disconnect()
        }
    }, [editor])

    const handleDetectFromVideo = useCallback(async () => {
        if (!editor) return

        if (IsQQBrowser()) {
            Oops('QQ浏览器暂不支持视频检测，请使用其他浏览器试试')
            return
        }

        const body = await editor.GetBodyToSetPose()
        if (!body) {
            ShowToast({ title: i18n.t('Please select a skeleton!!') })
            return
        }

        const loading = GetLoading(500)
        setIsProcessing(true)

        try {
            const dataUrl = await uploadVideo()
            if (!dataUrl) {
                setIsProcessing(false)
                return
            }

            const video = await getVideo(dataUrl)

            // Set the video URL for display
            setVideoUrl(dataUrl)
            videoRef.current = video

            loading.show({ title: i18n.t('Downloading MediaPipe Pose Model') })

            // Initialize pose landmarker if needed
            await initializePoseLandmarker()

            loading.hide()

            // Stop any existing detection process
            if (detectProcessRef.current) {
                detectProcessRef.current.stop()
            }

            detectProcessRef.current = DetectPoseFromVideo(
                video,
                async (result) => {
                    const positions = convertToWorldLandmarks(result)
                    if (positions) {
                        await editor.SetBlazePose(positions)
                    }
                },
                () => {
                    setIsPlaying(false)
                    ShowToast({ title: i18n.t('Video processing completed') })
                }
            )

            setIsPlaying(true)

            // Start playing the video
            video.play()
        } catch (error) {
            loading.hide()
            if (error === 'Timeout') {
                Oops(error)
            } else
                Oops(
                    i18n.t(
                        'If you try to detect anime characters, you may get an error. Please try again with real videos.'
                    ) +
                    '\n' +
                    error
                )
            console.error(error)
        } finally {
            setIsProcessing(false)
        }
    }, [editor])


    const handleStopDetection = useCallback(() => {
        if (detectProcessRef.current) {
            detectProcessRef.current.stop()
            detectProcessRef.current = null
        }
        if (videoRef.current) {
            videoRef.current.pause()
        }
        setIsPlaying(false)
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (detectProcessRef.current) {
                detectProcessRef.current.stop()
            }
        }
    }, [])

    return (
        <div className={classes.container}>
            {/* Menu bar at the top */}
            <div className={classes.menuBar}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '10px',
                    }}
                >
                    <button
                        onClick={handleDetectFromVideo}
                        disabled={isProcessing || isPlaying}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            backgroundColor: '#0084ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isProcessing || isPlaying ? 'wait' : 'pointer',
                            opacity: isProcessing || isPlaying ? 0.6 : 1,
                            transition: 'all 0.3s',
                        }}
                        onMouseEnter={(e) => {
                            if (!isProcessing && !isPlaying) {
                                e.currentTarget.style.backgroundColor = '#0066cc'
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#0084ff'
                        }}
                    >
                        {isProcessing ? i18n.t('Processing...') : i18n.t('Detect From Video')}
                    </button>

                    {isPlaying && (
                        <button
                            onClick={handleStopDetection}
                            style={{
                                padding: '8px 16px',
                                fontSize: '14px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#c82333'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#dc3545'
                            }}
                        >
                            {i18n.t('Stop')}
                        </button>
                    )}
                </div>
            </div>

            {/* Split view container */}
            <div className={classes.splitView}>
                {/* Left side - Video view */}
                <div className={classes.leftPanel}>
                    {videoUrl ? (
                        <video
                            src={videoUrl}
                            controls
                            autoPlay
                            muted
                            loop
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                            }}
                            onLoadedMetadata={(e) => {
                                const video = e.currentTarget
                                videoRef.current = video
                                if (isPlaying) {
                                    video.play()
                                }
                            }}
                        />
                    ) : (
                        <div className={classes.placeholder}>
                            <h2>{i18n.t('Pose Detection from Video')}</h2>
                            <p>{i18n.t('Upload a video to detect human pose and generate animated 3D skeleton')}</p>
                        </div>
                    )}
                </div>

                {/* Right side - 3D skeleton view */}
                <div ref={backgroundRef} className={classes.rightPanel}>
                    <canvas
                        className={classes.threejsCanvas}
                        tabIndex={-1}
                        ref={canvasRef}
                        onContextMenu={(e) => {
                            e.preventDefault()
                        }}
                    ></canvas>
                </div>
            </div>

            {/* Hidden preview canvas - still needed for the editor */}
            <canvas
                ref={previewCanvasRef}
                style={{ display: 'none' }}
            ></canvas>
        </div>
    )
}

export default App