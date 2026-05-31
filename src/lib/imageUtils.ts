export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues on CodeSandbox
        image.src = url
    })

export function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180
}

/**
 * Returns the rotated and cropped canvas elements.
 */
export async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    brightness: number = 100,
    _flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        return null
    }

    // set canvas size to match the crop
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // draw rotated image and scale it to the proper size
    ctx.filter = `brightness(${brightness}%)`

    ctx.translate(-pixelCrop.x, -pixelCrop.y)
    ctx.drawImage(
        image,
        0,
        0,
        image.width,
        image.height
    )

    // As a blob
    return new Promise((resolve, _reject) => {
        canvas.toBlob((file) => {
            resolve(file)
        }, 'image/jpeg')
    })
}
