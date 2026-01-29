import { useState, useCallback, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Download, Info, ZoomIn, ZoomOut, RotateCw, Play, Pause } from 'lucide-react'
import { format } from 'date-fns'
import type { ImageMetadata } from '@petrel/shared'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import type { LightboxProps } from './types'

/**
 * Fullscreen lightbox for viewing images with zoom, pan, EXIF display, and slideshow
 */
export function Lightbox({
    images,
    initialIndex = 0,
    open,
    onOpenChange,
    onDownload,
}: LightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [zoom, setZoom] = useState(1)
    const [showInfo, setShowInfo] = useState(false)
    const [isSlideshow, setIsSlideshow] = useState(false)
    const slideshowRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const currentImage = images[currentIndex]
    const metadata = currentImage?.metadata as ImageMetadata | undefined

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setCurrentIndex(initialIndex)
            setZoom(1)
        }
    }, [open, initialIndex])

    // Slideshow timer
    useEffect(() => {
        if (isSlideshow) {
            slideshowRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % images.length)
            }, 4000)
        }
        return () => {
            if (slideshowRef.current) {
                clearInterval(slideshowRef.current)
            }
        }
    }, [isSlideshow, images.length])

    const goToNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length)
        setZoom(1)
    }, [images.length])

    const goToPrevious = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
        setZoom(1)
    }, [images.length])

    const handleZoomIn = useCallback(() => {
        setZoom((prev) => Math.min(prev + 0.5, 4))
    }, [])

    const handleZoomOut = useCallback(() => {
        setZoom((prev) => Math.max(prev - 0.5, 0.5))
    }, [])

    const handleResetZoom = useCallback(() => {
        setZoom(1)
    }, [])

    const toggleSlideshow = useCallback(() => {
        setIsSlideshow((prev) => !prev)
    }, [])

    // Keyboard navigation
    useEffect(() => {
        if (!open) return

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault()
                    goToPrevious()
                    break
                case 'ArrowRight':
                    e.preventDefault()
                    goToNext()
                    break
                case 'Escape':
                    e.preventDefault()
                    onOpenChange(false)
                    break
                case '+':
                case '=':
                    e.preventDefault()
                    handleZoomIn()
                    break
                case '-':
                    e.preventDefault()
                    handleZoomOut()
                    break
                case 'i':
                    e.preventDefault()
                    setShowInfo((prev) => !prev)
                    break
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [open, goToNext, goToPrevious, onOpenChange, handleZoomIn, handleZoomOut])

    if (!currentImage) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none h-screen w-screen p-0 border-none bg-black/95">
                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
                    <div className="text-sm text-white">
                        {currentIndex + 1} / {images.length}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={toggleSlideshow}
                        >
                            {isSlideshow ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={handleZoomOut}
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={handleResetZoom}
                        >
                            <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={handleZoomIn}
                        >
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn('h-8 w-8 text-white hover:bg-white/20', showInfo && 'bg-white/20')}
                            onClick={() => setShowInfo((prev) => !prev)}
                        >
                            <Info className="h-4 w-4" />
                        </Button>
                        {onDownload && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white hover:bg-white/20"
                                onClick={() => onDownload(currentImage)}
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Main image */}
                <div className="flex h-full w-full items-center justify-center overflow-auto">
                    <img
                        src={api.getThumbnailUrl(currentImage.id, 'large')}
                        alt={currentImage.name}
                        className="max-h-full max-w-full object-contain transition-transform duration-200"
                        style={{ transform: `scale(${zoom})` }}
                        draggable={false}
                    />
                </div>

                {/* Navigation arrows */}
                {images.length > 1 && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 text-white hover:bg-white/20"
                            onClick={goToPrevious}
                        >
                            <ChevronLeft className="h-8 w-8" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 text-white hover:bg-white/20"
                            onClick={goToNext}
                        >
                            <ChevronRight className="h-8 w-8" />
                        </Button>
                    </>
                )}

                {/* EXIF info panel */}
                {showInfo && metadata && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 text-sm text-white">
                        <div className="mx-auto max-w-2xl">
                            <h3 className="mb-2 font-medium">{currentImage.name}</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 md:grid-cols-4">
                                <div>
                                    <span className="text-muted-foreground">Dimensions: </span>
                                    {metadata.width} × {metadata.height}
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Format: </span>
                                    {metadata.format.toUpperCase()}
                                </div>
                                {metadata.exif && (
                                    <>
                                        {metadata.exif.make && (
                                            <div>
                                                <span className="text-muted-foreground">Camera: </span>
                                                {metadata.exif.make} {metadata.exif.model}
                                            </div>
                                        )}
                                        {metadata.exif.lens && (
                                            <div>
                                                <span className="text-muted-foreground">Lens: </span>
                                                {metadata.exif.lens}
                                            </div>
                                        )}
                                        {metadata.exif.focalLength && (
                                            <div>
                                                <span className="text-muted-foreground">Focal: </span>
                                                {metadata.exif.focalLength}
                                            </div>
                                        )}
                                        {metadata.exif.fNumber && (
                                            <div>
                                                <span className="text-muted-foreground">Aperture: </span>
                                                {metadata.exif.fNumber}
                                            </div>
                                        )}
                                        {metadata.exif.exposureTime && (
                                            <div>
                                                <span className="text-muted-foreground">Shutter: </span>
                                                {metadata.exif.exposureTime}
                                            </div>
                                        )}
                                        {metadata.exif.iso && (
                                            <div>
                                                <span className="text-muted-foreground">ISO: </span>
                                                {metadata.exif.iso}
                                            </div>
                                        )}
                                        {metadata.exif.dateTaken && (
                                            <div>
                                                <span className="text-muted-foreground">Date: </span>
                                                {format(new Date(metadata.exif.dateTaken), 'PPP')}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
