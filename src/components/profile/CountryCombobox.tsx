import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { countries, getCountryFlag, getCountryName } from '@/utils/countries';

interface CountryComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function CountryCombobox({
  value,
  onValueChange,
  placeholder = 'Select your country',
  disabled = false,
  id,
  className,
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-11 w-full justify-between border-zinc-800 bg-zinc-900/50 font-normal text-white hover:bg-zinc-900/70 hover:text-white focus:border-white/30 focus:ring-white/20',
            !value && 'text-zinc-500',
            className,
          )}
        >
          <span className="truncate text-left">
            {value ? (
              <>
                {getCountryFlag(value)} {getCountryName(value)}
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="z-[2000] w-[var(--radix-popover-trigger-width)] border-zinc-800 bg-zinc-900 p-0 text-white"
      >
        <Command className="bg-zinc-900">
          <CommandInput
            placeholder="Type to search countries..."
            className="h-11 text-white placeholder:text-zinc-500"
          />
          <CommandList className="max-h-[240px] overflow-y-auto overscroll-contain">
            <CommandEmpty className="py-4 text-zinc-400">No country found.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  onSelect={() => {
                    onValueChange(country.code);
                    setOpen(false);
                  }}
                  className="cursor-pointer text-white aria-selected:bg-zinc-800 aria-selected:text-white"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === country.code ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {getCountryFlag(country.code)} {country.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
