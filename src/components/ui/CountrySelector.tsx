import React from "react";
import { countries, getCountryFlagUrl } from "@/utils/countries";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

interface CountrySelectorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const CountrySelector = ({ value, onChange, placeholder = "Select Country", className }: CountrySelectorProps) => {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={`bg-zinc-900/50 border-zinc-800 focus:border-rose-500/50 text-white ${className}`}>
                <SelectValue placeholder={placeholder}>
                    {value ? (
                        <div className="flex items-center gap-2">
                            <img
                                src={getCountryFlagUrl(value)}
                                alt={value}
                                className="w-5 h-3.5 object-cover rounded shadow-sm"
                            />
                            <span>{countries.find(c => c.code === value)?.name}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-gray-500">
                            <Globe className="w-4 h-4" />
                            <span>{placeholder}</span>
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#121214] border-zinc-800 text-white max-h-[300px]">
                {countries.map((country) => (
                    <SelectItem
                        key={country.code}
                        value={country.code}
                        className="focus:bg-zinc-800 focus:text-rose-500 cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <img
                                src={getCountryFlagUrl(country.code)}
                                alt={country.code}
                                className="w-5 h-3.5 object-cover rounded shadow-sm border border-white/5"
                            />
                            <span>{country.name}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default CountrySelector;
