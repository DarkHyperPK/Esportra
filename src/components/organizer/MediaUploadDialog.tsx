import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaFile {
    file: File;
    preview: string;
    description: string;
    type: 'image' | 'video';
}

interface MediaUploadDialogProps {
    open: boolean;
    onClose: () => void;
    onUpload: (files: MediaFile[]) => Promise<void>;
}

const MediaUploadDialog: React.FC<MediaUploadDialogProps> = ({ open, onClose, onUpload }) => {
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        const newMediaFiles: MediaFile[] = selectedFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            description: '',
            type: file.type.startsWith('video') ? 'video' : 'image'
        }));
        setFiles(prev => [...prev, ...newMediaFiles]);
    };

    const handleRemoveFile = (index: number) => {
        setFiles(prev => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[index].preview);
            updated.splice(index, 1);
            return updated;
        });
    };

    const handleDescriptionChange = (index: number, value: string) => {
        setFiles(prev => {
            const updated = [...prev];
            updated[index].description = value;
            return updated;
        });
    };

    const handleUpload = async () => {
        if (files.length === 0) return;
        setUploading(true);
        try {
            await onUpload(files);
            // Clean up previews
            files.forEach(f => URL.revokeObjectURL(f.preview));
            setFiles([]);
            onClose();
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        if (!uploading) {
            files.forEach(f => URL.revokeObjectURL(f.preview));
            setFiles([]);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                        <Upload className="w-5 h-5 text-esports-purple" />
                        Upload Media
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Drop Zone / File Selector */}
                    <div
                        onClick={() => inputRef.current?.click()}
                        className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center cursor-pointer hover:border-esports-purple/50 transition-colors group"
                    >
                        <div className="flex flex-col items-center gap-3">
                            <div className="p-4 rounded-full bg-esports-purple/10 group-hover:bg-esports-purple/20 transition-colors">
                                <Upload className="w-8 h-8 text-esports-purple" />
                            </div>
                            <div>
                                <p className="text-white font-medium">Click to select files</p>
                                <p className="text-sm text-gray-400">or drag and drop images/videos</p>
                            </div>
                        </div>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </div>

                    {/* File List with Previews and Description Inputs */}
                    <AnimatePresence>
                        {files.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <p className="text-sm text-gray-400">{files.length} file(s) selected</p>
                                {files.map((media, index) => (
                                    <motion.div
                                        key={index}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10"
                                    >
                                        {/* Preview */}
                                        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-black">
                                            {media.type === 'video' ? (
                                                <video src={media.preview} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={media.preview} alt="Preview" className="w-full h-full object-cover" />
                                            )}
                                            <div className="absolute top-1 left-1 p-1 rounded bg-black/60">
                                                {media.type === 'video' ? (
                                                    <Video className="w-3 h-3 text-white" />
                                                ) : (
                                                    <ImageIcon className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Description Input */}
                                        <div className="flex-1 flex flex-col gap-2">
                                            <p className="text-sm text-gray-300 truncate">{media.file.name}</p>
                                            <Textarea
                                                placeholder="Add a description..."
                                                value={media.description}
                                                onChange={(e) => handleDescriptionChange(index, e.target.value)}
                                                className="flex-1 bg-white/5 border-white/10 text-white resize-none text-sm"
                                                rows={2}
                                            />
                                        </div>

                                        {/* Remove Button */}
                                        <button
                                            onClick={() => handleRemoveFile(index)}
                                            className="self-start p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <DialogFooter className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={uploading}
                        className="border-white/20 text-white hover:bg-white/10"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={files.length === 0 || uploading}
                        className="bg-esports-purple hover:bg-esports-purple/90 min-w-[120px]"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload ({files.length})
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MediaUploadDialog;
