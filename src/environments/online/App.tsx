import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadImage } from '../../utils/transfer'
import classes from './App.module.css'
import { useBodyEditor } from '../../hooks'
import { DetectPosefromImage } from '../../utils/detect'
import { getImage } from '../../utils/image'
import { GetLoading } from '../../components/Loading'
import { ShowToast } from '../../components/Toast'
import { Oops } from '../../components/Oops'
import i18n, { IsChina } from '../../i18n'
import { IsQQBrowser } from '../../utils/browser'
import { SetCDNBase } from '../../utils/detect'


function App() {
    const canvasRef = useRef(null)
    const previewCanvasRef = useRef(null)
    const backgroundRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)
    const editor = useBodyEditor(canvasRef, previewCanvasRef, backgroundRef)
    const [isProcessing, setIsProcessing] = useState(false)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    
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

    const handleDetectFromImage = useCallback(async () => {
        if (!editor) return
        
        if (IsQQBrowser()) {
            Oops('QQ浏览器暂不支持图片检测，请使用其他浏览器试试')
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
            const dataUrl = await uploadImage()
            if (!dataUrl) {
                setIsProcessing(false)
                return
            }

            const image = await getImage(dataUrl)
            
            // Set the image URL for display
            setImageUrl(dataUrl)

            loading.show({ title: i18n.t('Downloading MediaPipe Pose Model') })
            const result = await DetectPosefromImage(image)
            loading.hide()

            if (result) {
                if (!result.poseWorldLandmarks)
                    throw new Error(JSON.stringify(result))

                const positions: [number, number, number][] =
                    result.poseWorldLandmarks.map(({ x, y, z }) => [
                        x * 100,
                        -y * 100,
                        -z * 100,
                    ])

                await editor.SetBlazePose(positions)
            }
        } catch (error) {
            loading.hide()
            if (error === 'Timeout') {
                if (IsChina())
                    Oops(
                        '下载超时，请点击"从图片中检测 [中国]"或者开启魔法，再试一次。' +
                            '\n' +
                            error
                    )
                else Oops(error)
            } else
                Oops(
                    i18n.t(
                        'If you try to detect anime characters, you may get an error. Please try again with photos.'
                    ) +
                        '\n' +
                        error
                )
            console.error(error)
        } finally {
            setIsProcessing(false)
        }
    }, [editor])

    const handleDetectFromImageChina = useCallback(async () => {
        SetCDNBase(false)
        await handleDetectFromImage()
    }, [handleDetectFromImage])

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
                        onClick={handleDetectFromImage}
                        disabled={isProcessing}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            backgroundColor: '#0084ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isProcessing ? 'wait' : 'pointer',
                            opacity: isProcessing ? 0.6 : 1,
                            transition: 'all 0.3s',
                        }}
                        onMouseEnter={(e) => {
                            if (!isProcessing) {
                                e.currentTarget.style.backgroundColor = '#0066cc'
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#0084ff'
                        }}
                    >
                        {isProcessing ? i18n.t('Processing...') : i18n.t('Detect From Image')}
                    </button>
                    {IsChina() && (
                        <button
                            onClick={handleDetectFromImageChina}
                            disabled={isProcessing}
                            style={{
                                padding: '8px 16px',
                                fontSize: '14px',
                                backgroundColor: '#666',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isProcessing ? 'wait' : 'pointer',
                                opacity: isProcessing ? 0.6 : 1,
                                transition: 'all 0.3s',
                            }}
                            onMouseEnter={(e) => {
                                if (!isProcessing) {
                                    e.currentTarget.style.backgroundColor = '#555'
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#666'
                            }}
                        >
                            {isProcessing ? i18n.t('Processing...') : i18n.t('Detect From Image') + ' [中国]'}
                        </button>
                    )}
                </div>
            </div>

            {/* Split view container */}
            <div className={classes.splitView}>
                {/* Left side - Image view */}
                <div className={classes.leftPanel}>
                    {imageUrl ? (
                        <img 
                            ref={imageRef}
                            src={imageUrl} 
                            alt="Detected pose" 
                            className={classes.detectedImage}
                        />
                    ) : (
                        <div className={classes.placeholder}>
                            <h2>{i18n.t('Pose Detection from Image')}</h2>
                            <p>{i18n.t('Upload an image to detect human pose and generate a 3D skeleton')}</p>
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