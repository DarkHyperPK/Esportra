import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Calendar, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface MediaItem {
    id: string;
    url: string;
    type: 'image' | 'video';
    caption?: string;
    created_at: string;
}

interface MediaLightboxProps {
    open: boolean;
    onClose: () => void;
    items: MediaItem[];
    initialIndex: number;
    isOwner: boolean;
    onDelete?: (id: string, url: string) => void;
}

const MediaLightbox: React.FC<MediaLightboxProps> = ({
    open,
    onClose,
    items,
    initialIndex,
    isOwner,
    onDelete
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    const currentItem = items[currentIndex];

    const goNext = () => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
    };

    const goPrev = () => {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowRight') goNext();
        if (e.key === 'ArrowLeft') goPrev();
        if (e.key === 'Escape') onClose();
    };

    if (!currentItem) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className="max-w-6xl w-[95vw] h-[90vh] p-0 bg-black/95 border-white/10 overflow-hidden"
                onKeyDown={handleKeyDown}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/60 text-white hover:bg-white/20 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex h-full">
                    {/* Media Display Area */}
                    <div className="flex-1 relative flex items-center justify-center bg-black">
                        {/* Navigation Arrows */}
                        {items.length > 1 && (
                            <>
                                <button
                                    onClick={goPrev}
                                    className="absolute left-4 z-40 p-3 rounded-full bg-black/60 text-white hover:bg-white/20 transition-colors"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={goNext}
                                    className="absolute right-4 z-40 p-3 rounded-full bg-black/60 text-white hover:bg-white/20 transition-colors"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}

                        {/* Media Content */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentItem.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="max-w-full max-h-full p-4"
                            >
                                {currentItem.type === 'video' ? (
                                    <video
                                        src={currentItem.url}
                                        controls
                                        autoPlay
                                        className="max-w-full max-h-[80vh] rounded-lg"
                                    />
                                ) : (
                                    <img
                                        src={currentItem.url}
                                        alt={currentItem.caption || 'Media'}
                                        className="max-w-full max-h-[80vh] object-contain rounded-lg"
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Sidebar with Details */}
                    <div className="w-80 bg-zinc-900 border-l border-white/10 p-6 flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-4">Details</h3>

                        {/* Caption */}
                        {currentItem.caption ? (
                            <p className="text-gray-300 text-sm mb-6 leading-relaxed">{currentItem.caption}</p>
                        ) : (
                            <p className="text-gray-500 text-sm italic mb-6">No description</p>
                        )}

                        {/* Metadata */}
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Calendar className="w-4 h-4" />
                                <span>{format(new Date(currentItem.created_at), 'MMM d, yyyy')}</span>
                            </div>
                        </div>

                        {/* Delete Button for Owner */}
                        {isOwner && onDelete && (
                            <div className="mt-auto pt-6">
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        onDelete(currentItem.id, currentItem.url);
                                        if (items.length === 1) {
                                            onClose();
                                        } else if (currentIndex === items.length - 1) {
                                            setCurrentIndex(currentIndex - 1);
                                        }
                                    }}
                                    className="w-full"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Media
                                </Button>
                            </div>
                        )}

                        {/* Pagination Indicator */}
                        {items.length > 1 && (
                            <div className="mt-4 text-center text-sm text-gray-500">
                                {currentIndex + 1} of {items.length}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MediaLightbox;
