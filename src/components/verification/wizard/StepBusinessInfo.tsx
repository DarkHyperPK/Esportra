import React from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Globe, AlignLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { VerificationWizardStepProps } from '@/types/verificationWizard';

const StepBusinessInfo: React.FC<VerificationWizardStepProps> = ({ data, updateData, errors, role }) => {

    // Organization Types for Organizer Role
    const organizationTypes = [
        { value: 'esports_organization', label: 'Esports Organization' },
        { value: 'tournament_organizer', label: 'Tournament Organizer' },
        { value: 'gaming_community', label: 'Gaming Community' },
        { value: 'esports_team', label: 'Esports Team' },
        { value: 'gaming_company', label: 'Gaming Company' },
        { value: 'event_management', label: 'Event Management Company' },
        { value: 'other', label: 'Other' }
    ];

    const isVenue = role === 'venue_owner';

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">
                    {isVenue ? 'Venue Information' : 'Organization Information'}
                </h2>
                <p className="text-gray-400">
                    {isVenue ? 'Details about your gaming zone' : 'Tell us about your organization'}
                </p>
            </div>

            <div className="w-full h-px bg-white/5 my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Organization / Venue Name */}
                <div className="space-y-2">
                    <Label htmlFor="business_name" className="text-gray-400">
                        {isVenue ? 'Venue Name *' : 'Organization Name *'}
                    </Label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Input
                            id="business_name"
                            value={isVenue ? data.venue_name : data.business_name} // venue_name is alias for business_name often, or separate
                            onChange={(e) => {
                                const val = e.target.value;
                                if (isVenue) updateData({ venue_name: val, business_name: val });
                                else updateData({ business_name: val });
                            }}
                            className={cn(errors.business_name && "border-red-500", "pl-10 bg-[#0a0a0c] border-white/10 text-white")}
                            placeholder={isVenue ? "GameZone Arena" : "Pro Gamers Org"}
                        />
                    </div>
                </div>

                {/* Org Type - Only for Organizers */}
                {!isVenue && (
                    <div className="space-y-2">
                        <Label htmlFor="organization_type" className="text-gray-400">Organization Type *</Label>
                        <Select
                            value={data.organization_type}
                            onValueChange={(value) => updateData({ organization_type: value, business_type: value })}
                        >
                            <SelectTrigger className={cn(errors.organization_type && "border-red-500", "bg-[#0a0a0c] border-white/10 text-white")}>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {organizationTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Operating Hours - Only for Venues */}
                {isVenue && (
                    <div className="space-y-2">
                        <Label htmlFor="operating_hours" className="text-gray-400">Operating Hours *</Label>
                        <Input
                            id="operating_hours"
                            value={data.operating_hours}
                            onChange={(e) => updateData({ operating_hours: e.target.value })}
                            className={cn(errors.operating_hours && "border-red-500", "bg-[#0a0a0c] border-white/10 text-white")}
                            placeholder="e.g. 10AM - 12AM Daily"
                        />
                    </div>
                )}

                {/* Website - Optional for both */}
                <div className="space-y-2">
                    <Label htmlFor="website" className="text-gray-400">Website</Label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Input
                            id="website"
                            value={data.website}
                            onChange={(e) => updateData({ website: e.target.value })}
                            className="pl-10 bg-[#0a0a0c] border-white/10 text-white"
                            placeholder="https://"
                        />
                    </div>
                </div>

                {/* Address - Mandatory for Venues, Optional for Orgs in this form but useful */}
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="business_address" className="text-gray-400">
                        {isVenue ? 'Complete Address *' : 'Location / Address'}
                    </Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Input
                            id="business_address"
                            value={data.business_address}
                            onChange={(e) => updateData({ business_address: e.target.value })}
                            className={cn(isVenue && errors.business_address && "border-red-500", "pl-10 bg-[#0a0a0c] border-white/10 text-white")}
                            placeholder="Full street address"
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="business_description" className="text-gray-400">
                        {isVenue ? 'Venue Description *' : 'Organization Description *'}
                    </Label>
                    <div className="relative">
                        <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <Textarea
                            id="business_description"
                            value={data.business_description}
                            onChange={(e) => updateData({ business_description: e.target.value })}
                            className={cn(errors.business_description && "border-red-500", "pl-10 min-h-[100px] bg-[#0a0a0c] border-white/10 text-white")}
                            placeholder={isVenue ? "Describe your gaming zone, amenities, vibes..." : "Mission statement, goals, who you are..."}
                        />
                    </div>
                </div>

            </div>
        </motion.div>
    );
};

export default StepBusinessInfo;
