import React from 'react';
import { motion } from 'framer-motion';
import { Users, Mail, Phone, Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { VerificationWizardStepProps } from '@/types/verificationWizard';

const StepPersonalDetails: React.FC<VerificationWizardStepProps> = ({ data, updateData, errors }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Personal Information</h2>
                <p className="text-gray-400">Basic details for your verification profile</p>
            </div>

            <div className="w-full h-px bg-white/5 my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-gray-400">First Name *</Label>
                    <div className="relative">
                        <Users className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Input
                            id="first_name"
                            value={data.first_name}
                            onChange={(e) => updateData({ first_name: e.target.value })}
                            className={cn(errors.first_name && "border-red-500", "pl-10 bg-[#0a0a0c] border-white/10 text-white")}
                            placeholder="John"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-gray-400">Last Name *</Label>
                    <div className="relative">
                        <Users className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Input
                            id="last_name"
                            value={data.last_name}
                            onChange={(e) => updateData({ last_name: e.target.value })}
                            className={cn(errors.last_name && "border-red-500", "pl-10 bg-[#0a0a0c] border-white/10 text-white")}
                            placeholder="Doe"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="dob" className="text-gray-400">Date of Birth *</Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Input
                            id="dob"
                            type="date"
                            value={data.dob}
                            onChange={(e) => updateData({ dob: e.target.value })}
                            className={cn(errors.dob && "border-red-500", "pl-10 bg-[#0a0a0c] border-white/10 text-white")}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="contact_phone" className="text-gray-400">Phone Number *</Label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Input
                            id="contact_phone"
                            value={data.contact_phone}
                            onChange={(e) => updateData({ contact_phone: e.target.value })}
                            className={cn(errors.contact_phone && "border-red-500", "pl-10 bg-[#0a0a0c] border-white/10 text-white")}
                            placeholder="+92 300 1234567"
                        />
                    </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="contact_email" className="text-gray-400">Contact Email *</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Input
                            id="contact_email"
                            type="email"
                            value={data.contact_email}
                            onChange={(e) => updateData({ contact_email: e.target.value })}
                            className={cn(errors.contact_email && "border-red-500", "pl-10 bg-[#0a0a0c] border-white/10 text-white")}
                            placeholder="you@example.com"
                        />
                    </div>
                    {errors.contact_email && <p className="text-xs text-red-500">{errors.contact_email}</p>}
                </div>
            </div>
        </motion.div>
    );
};

export default StepPersonalDetails;
