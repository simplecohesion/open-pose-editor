import { useCallback, useRef, useState } from 'react'
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

const { app, threejsCanvas } = classes

function App() {
    const canvasRef = useRef(null)
    const previewCanvasRef = useRef(null)
    const backgroundRef = useRef<HTMLDivElement>(null)
    const editor = useBodyEditor(canvasRef, previewCanvasRef, backgroundRef)
    const [isProcessing, setIsProcessing] = useState(false)
    const [hasImage, setHasImage] = useState(false)

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
            
            // Set background
            const div = backgroundRef.current
            if (div) {
                div.style.backgroundImage = dataUrl ? `url(${dataUrl})` : 'none'
                div.style.backgroundSize = 'contain'
                div.style.backgroundPosition = 'center'
                div.style.backgroundRepeat = 'no-repeat'
            }

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
                setHasImage(true)
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
        <div ref={backgroundRef} className={classes.background}>
            <canvas
                className={threejsCanvas}
                tabIndex={-1}
                ref={canvasRef}
                onContextMenu={(e) => {
                    e.preventDefault()
                }}
            ></canvas>
            <div className={app} style={{ pointerEvents: 'none' }}>
                {/* Menu bar at the top */}
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: '10px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '10px',
                        pointerEvents: 'auto',
                        zIndex: 1000,
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

                {/* Show welcome message only when no image is loaded */}
                {!hasImage && (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100vh',
                            gap: '20px',
                            pointerEvents: 'none',
                        }}
                    >
                        <h1 style={{ color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                            {i18n.t('Pose Detection from Image')}
                        </h1>
                        <p style={{ 
                            color: 'white', 
                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                            maxWidth: '600px',
                            textAlign: 'center',
                            lineHeight: '1.5'
                        }}>
                            {i18n.t('Upload an image to detect human pose and generate a 3D skeleton')}
                        </p>
                    </div>
                )}
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