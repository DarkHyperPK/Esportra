import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '@/lib/imageUtils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Sun, Crop, Check, X } from 'lucide-react'

interface BannerEditorProps {
    image: string
    open: boolean
    onClose: () => void
    onSave: (blob: Blob) => void
}

const BannerEditor: React.FC<BannerEditorProps> = ({ image, open, onClose, onSave }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [brightness, setBrightness] = useState(100)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleSave = async () => {
        try {
            const croppedImage = await getCroppedImg(
                image,
                croppedAreaPixels,
                brightness
            )
            if (croppedImage) {
                onSave(croppedImage)
            }
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Crop className="w-5 h-5 text-esports-purple" />
                        Edit Banner
                    </DialogTitle>
                </DialogHeader>

                <div className="relative h-64 md:h-96 w-full bg-black rounded-lg overflow-hidden mt-4">
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        aspect={16 / 4} // Banner aspect ratio
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        style={{
                            containerStyle: {
                                background: '#0a0a0c'
                            },
                            mediaStyle: {
                                filter: `brightness(${brightness}%)`
                            }
                        }}
                    />
                </div>

                <div className="space-y-6 mt-6">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className="flex items-center gap-2 text-zinc-400">
                                <Crop className="w-4 h-4" /> Zoom
                            </span>
                            <span className="text-zinc-500 font-mono">{zoom.toFixed(1)}x</span>
                        </div>
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={(val) => setZoom(val[0])}
                            className="py-1"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className="flex items-center gap-2 text-zinc-400">
                                <Sun className="w-4 h-4 text-yellow-500" /> Brightness
                            </span>
                            <span className="text-zinc-500 font-mono">{brightness}%</span>
                        </div>
                        <Slider
                            value={[brightness]}
                            min={50}
                            max={150}
                            step={1}
                            onValueChange={(val) => setBrightness(val[0])}
                            className="py-1"
                        />
                    </div>
                </div>

                <DialogFooter className="mt-8 flex gap-3">
                    <Button variant="outline" onClick={onClose} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                        <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-esports-purple hover:bg-esports-purple/90 text-white">
                        <Check className="w-4 h-4 mr-2" /> Apply & Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default BannerEditor
