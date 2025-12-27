import React from 'react';

interface VetoTeamDisplayProps {
    team1Name: string;
    team1Logo?: string | null;
    team2Name: string;
    team2Logo?: string | null;
}

export const VetoTeamDisplay: React.FC<VetoTeamDisplayProps> = ({
    team1Name,
    team1Logo,
    team2Name,
    team2Logo,
}) => {
    return (
        <div className="mb-4 sm:mb-6 lg:mb-10 flex items-center justify-center gap-3 sm:gap-6 lg:gap-12 px-2 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
            <div className="flex flex-col items-center gap-1.5 sm:gap-2 lg:gap-3 flex-1 max-w-[100px] sm:max-w-[140px] lg:max-w-none">
                {team1Logo ? (
                    <img
                        src={team1Logo}
                        alt={team1Name}
                        className="max-w-12 max-h-12 sm:max-w-16 sm:max-h-16 md:max-w-20 md:max-h-20 lg:max-w-24 lg:max-h-24 w-auto h-auto object-contain"
                    />
                ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 flex items-center justify-center bg-white/5 rounded-lg">
                        <span className="text-white font-bold text-sm sm:text-base md:text-lg lg:text-xl">{team1Name.charAt(0)}</span>
                    </div>
                )}
                <span className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-bold text-white text-center truncate w-full px-1">{team1Name}</span>
            </div>
            <div className="text-white/30 font-light text-base sm:text-lg md:text-xl lg:text-2xl px-1 sm:px-2">VS</div>
            <div className="flex flex-col items-center gap-1.5 sm:gap-2 lg:gap-3 flex-1 max-w-[100px] sm:max-w-[140px] lg:max-w-none">
                {team2Logo ? (
                    <img
                        src={team2Logo}
                        alt={team2Name}
                        className="max-w-12 max-h-12 sm:max-w-16 sm:max-h-16 md:max-w-20 md:max-h-20 lg:max-w-24 lg:max-h-24 w-auto h-auto object-contain"
                    />
                ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 flex items-center justify-center bg-white/5 rounded-lg">
                        <span className="text-white font-bold text-sm sm:text-base md:text-lg lg:text-xl">{team2Name.charAt(0)}</span>
                    </div>
                )}
                <span className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-bold text-white text-center truncate w-full px-1">{team2Name}</span>
            </div>
        </div>
    );
};
