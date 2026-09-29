import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ChipGroup, CONTROL_CLASS, CONTROL_ERROR_CLASS, Field, FormSection } from '@/components/ui/kit';
import { WizardStepProps } from '@/types/tournamentWizard';
import ImageUploader from './ImageUploader';
import ArtworkPicker from '@/components/tournament/ArtworkPicker';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { WizardStepFrame } from './WizardStepFrame';

const DESCRIPTION_LIMIT = 5000;
const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

const StepBranding: React.FC<WizardStepProps> = ({ data, updateData, errors }) => {
    const { profile } = useAuth();
    const [bannerMode, setBannerMode] = useState<'upload' | 'artwork'>('upload');
    const organizerName = sanitize(profile?.username || profile?.full_name || 'unknown-organizer');
    const tournamentName = sanitize(data.name || 'unnamed-tournament');
    const length = data.description.length;

    return (
        <WizardStepFrame
            title="Make it recognizable"
            description="A banner and a clear description are what make players click and sign up."
        >
            <FormSection title="Banner" description="Used as the card background in listings and as the header on your tournament page.">
                <ChipGroup
                    label="Banner source"
                    value={bannerMode}
                    onChange={setBannerMode}
                    options={[{ value: 'upload', label: 'Upload your own' }, { value: 'artwork', label: 'Choose partner artwork' }]}
                />
                {bannerMode === 'upload' ? (
                    <ImageUploader
                        value={data.bannerUrl}
                        onChange={(url) => updateData({ bannerUrl: url })}
                        aspectRatio="banner"
                        label="Banner image"
                        helperText="Wide images work best. Keep text away from the edges; they get cropped on phones."
                        bucket="system.assets.website"
                        folder={`Tournament-card-banners/${organizerName}`}
                        customFileName={tournamentName}
                        useTimestamp={false}
                    />
                ) : (
                    <ArtworkPicker
                        gameName={data.game || ''}
                        onSelect={(url) => {
                            updateData({ bannerUrl: url });
                            setBannerMode('upload');
                        }}
                        uploadConfig={{ bucket: 'system.assets.website', folder: `Tournament-card-banners/${organizerName}` }}
                    />
                )}
            </FormSection>

            <FormSection title="Description" description="What's at stake, who it's for and anything players must know before they sign up.">
                <Field
                    label="Tournament description"
                    error={errors.description}
                    hint={
                        <span className="flex justify-between gap-4">
                            <span>At least 20 characters.</span>
                            <span className={cn('tabular-nums', length > DESCRIPTION_LIMIT * 0.96 && 'text-amber-300', length > DESCRIPTION_LIMIT && 'text-red-300')}>
                                {length}/{DESCRIPTION_LIMIT}
                            </span>
                        </span>
                    }
                >
                    <RichTextEditor
                        content={data.description || ''}
                        onChange={(content) => updateData({ description: content })}
                        className={errors.description ? 'border-red-500/70' : ''}
                    />
                </Field>
            </FormSection>

            <FormSection title="Stream">
                <Field label="Stream link" htmlFor="streamUrl" optional hint="Twitch, YouTube or Kick. Shown on the tournament page while matches are live." error={errors.streamUrl}>
                    <Input
                        id="streamUrl"
                        placeholder="https://twitch.tv/yourchannel"
                        value={data.streamUrl}
                        onChange={(e) => updateData({ streamUrl: e.target.value })}
                        className={cn(CONTROL_CLASS, errors.streamUrl && CONTROL_ERROR_CLASS)}
                    />
                </Field>
            </FormSection>
        </WizardStepFrame>
    );
};

export default StepBranding;
