import { Switch } from "@/components/ui/switch";

type Props = {
  reduceMotion: boolean;
  onChange: (on: boolean) => void;
};

/** Reduce motion switch. Off by default; saved on this device only. */
export const MotionSettingsCard = ({ reduceMotion, onChange }: Props) => (
  <div className="max-w-2xl space-y-6">
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <label htmlFor="reduce-motion" className="font-medium text-white">
            Reduce motion
          </label>
          <p className="mt-1 text-sm text-gray-400">
            Turns off animations and transitions across Esportra. Off by default; saved on this device.
          </p>
        </div>
        <Switch id="reduce-motion" checked={reduceMotion} onCheckedChange={onChange} className="mt-1 shrink-0" />
      </div>
    </div>
  </div>
);

export default MotionSettingsCard;
