export function getVideo(url: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video')
        
        video.src = url
        video.controls = true
        video.muted = true // Allow autoplay
        
        video.addEventListener('loadedmetadata', () => {
            resolve(video)
        })
        
        video.addEventListener('error', () => {
            reject('Failed to load video')
        })
    })
}