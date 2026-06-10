import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, Globe, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { countries, detectUserCountry, getCountryFlag } from '@/utils/countries';
import { validateCountryCode } from '@/utils/countryValidation';
import { maxDateOfBirthInputValue, validateDateOfBirth } from '@/utils/dobValidation';
import {
  profileNeedsCountryInCompletion,
  shouldPromptProfileCompletion,
} from '@/utils/profileCompletion';

export function ProfileCompletionPrompt() {
  const { user, profile, loading, updateProfile } = useAuth();
  const location = useLocation();
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [detectingCountry, setDetectingCountry] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dobError, setDobError] = useState<string | null>(null);
  const [countryError, setCountryError] = useState<string | null>(null);

  const shouldShow = useMemo(
    () => shouldPromptProfileCompletion(location.pathname, profile, !!user, loading),
    [location.pathname, profile, user, loading],
  );

  const needsCountry = useMemo(
    () => profileNeedsCountryInCompletion(profile),
    [profile],
  );

  useEffect(() => {
    if (!shouldShow || !needsCountry) return;

    let cancelled = false;
    const detectCountry = async () => {
      setDetectingCountry(true);
      try {
        const detected = await detectUserCountry();
        if (!cancelled && detected) {
          setCountryCode(detected);
        }
      } finally {
        if (!cancelled) setDetectingCountry(false);
      }
    };

    void detectCountry();
    return () => {
      cancelled = true;
    };
  }, [shouldShow, needsCountry]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setDobError(null);
    setCountryError(null);

    const dobResult = validateDateOfBirth(dateOfBirth);
    if (!dobResult.valid) {
      setDobError(dobResult.error ?? 'Invalid date of birth.');
      return;
    }

    const updates: { date_of_birth: string; country_code?: string } = {
      date_of_birth: dobResult.normalized!,
    };

    if (needsCountry) {
      const countryResult = validateCountryCode(countryCode);
      if (!countryResult.valid) {
        setCountryError(countryResult.error ?? 'Invalid country.');
        return;
      }
      updates.country_code = countryResult.normalized!;
    }

    setSubmitting(true);
    try {
      await updateProfile(updates);
    } catch {
      // updateProfile already surfaces errors via toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={shouldShow} onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-md border-zinc-800 bg-[#121214] text-white [&>button]:hidden"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Complete your profile</DialogTitle>
          <DialogDescription className="text-zinc-400">
            We need your date of birth to keep tournament eligibility accurate.
            {needsCountry ? ' Please also confirm your country.' : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="profile-dob" className="flex items-center gap-2 text-white/80">
              <Calendar className="h-4 w-4 text-rose-500" />
              Date of Birth
            </Label>
            <Input
              id="profile-dob"
              type="date"
              value={dateOfBirth}
              max={maxDateOfBirthInputValue()}
              onChange={(event) => setDateOfBirth(event.target.value)}
              className="h-11 border-zinc-800 bg-zinc-900/50 text-white [color-scheme:dark]"
              required
            />
            {dobError && <p className="text-sm text-red-400">{dobError}</p>}
          </div>

          {needsCountry && (
            <div className="space-y-2">
              <Label htmlFor="profile-country" className="flex items-center gap-2 text-white/80">
                <Globe className="h-4 w-4 text-rose-500" />
                Country
              </Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger
                  id="profile-country"
                  className="h-11 border-zinc-800 bg-zinc-900/50 text-white"
                >
                  <SelectValue placeholder={detectingCountry ? 'Detecting country...' : 'Select your country'} />
                </SelectTrigger>
                <SelectContent className="max-h-60 border-zinc-800 bg-zinc-900 text-white">
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {getCountryFlag(country.code)} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {countryError && <p className="text-sm text-red-400">{countryError}</p>}
            </div>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-rose-500 hover:bg-rose-600"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save and continue'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
