import React from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { VerificationWizardStepProps } from '@/types/verificationWizard';

const StepDocuments: React.FC<VerificationWizardStepProps> = ({ data, updateData, errors }) => {

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'cnicFront' | 'cnicBack') => {
        const file = e.target.files?.[0] || null;
        updateData({ [field]: file });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Identity Verification</h2>
                <p className="text-gray-400">Upload your CNIC to verify your identity. This is kept secure.</p>
            </div>

            <div className="w-full h-px bg-white/5 my-6" />

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-200">
                    Please ensure your CNIC images are clear and strictly readable. Blurry images will result in rejection.
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* CNIC Front */}
                <div className="space-y-3">
                    <Label className="text-white font-medium">CNIC Front Side *</Label>
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 relative group",
                            errors.cnicFront ? "border-red-500/50 bg-red-500/5" :
                                data.cnicFront ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-white/20 hover:bg-white/5"
                        )}
                    >
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'cnicFront')}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />

                        {data.cnicFront ? (
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                                </div>
                                <p className="text-emerald-400 font-medium truncate max-w-full px-4">{data.cnicFront.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{(data.cnicFront.size / 1024 / 1024).toFixed(2)} MB</p>
                                <p className="text-xs text-gray-400 mt-2">Click to replace</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-white/10 transition-colors">
                                    <FileText className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
                                </div>
                                <p className="text-gray-300 font-medium">Upload Front Image</p>
                                <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
                            </div>
                        )}
                    </div>
                    {errors.cnicFront && <p className="text-xs text-red-500 text-center">{errors.cnicFront}</p>}
                </div>

                {/* CNIC Back */}
                <div className="space-y-3">
                    <Label className="text-white font-medium">CNIC Back Side *</Label>
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 relative group",
                            errors.cnicBack ? "border-red-500/50 bg-red-500/5" :
                                data.cnicBack ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-white/20 hover:bg-white/5"
                        )}
                    >
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'cnicBack')}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />

                        {data.cnicBack ? (
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                                </div>
                                <p className="text-emerald-400 font-medium truncate max-w-full px-4">{data.cnicBack.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{(data.cnicBack.size / 1024 / 1024).toFixed(2)} MB</p>
                                <p className="text-xs text-gray-400 mt-2">Click to replace</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-white/10 transition-colors">
                                    <FileText className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
                                </div>
                                <p className="text-gray-300 font-medium">Upload Back Image</p>
                                <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
                            </div>
                        )}
                    </div>
                    {errors.cnicBack && <p className="text-xs text-red-500 text-center">{errors.cnicBack}</p>}
                </div>
            </div>

        </motion.div>
    );
};

export default StepDocuments;
