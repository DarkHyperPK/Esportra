import { cn } from '@/lib/utils';

export type VetoLayoutMode = 'modal' | 'fullscreen' | 'embedded';

export interface VetoLayoutConfig {
  shell: string;
  grid: string;
  rail: string;
  stage: string;
  stageGrid: string;
  sequenceScroll: string;
  mapPool: {
    gridCols: string;
    tileHeight: string;
    minHeight: string;
    gap: string;
    mapNameSize: string;
  };
  headerCompact: boolean;
  teamCompact: boolean;
  selectedMapsCompact: boolean;
  sequenceCompact: boolean;
  sequenceColumns: boolean;
}

export function getVetoLayoutConfig(mode: VetoLayoutMode, isComplete: boolean): VetoLayoutConfig {
  const isModal = mode === 'modal';
  const isFullscreen = mode === 'fullscreen';
  const isEmbedded = mode === 'embedded';

  return {
    shell: cn(
      'w-full font-heading bg-[#09090b]',
      isModal && 'p-2 sm:p-3',
      isFullscreen && 'min-h-screen px-4 py-4 lg:px-6 xl:px-8 lg:py-6',
      isEmbedded && 'max-w-[1400px] mx-auto p-3 sm:p-4 lg:p-6',
    ),
    grid: cn(
      'min-h-0 grid grid-cols-1 gap-3 sm:gap-4',
      isModal && 'md:grid-cols-[minmax(240px,28%)_minmax(0,1fr)] md:gap-3 lg:grid-cols-[minmax(260px,28%)_minmax(0,1fr)]',
      isEmbedded && 'lg:grid-cols-[minmax(240px,26%)_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]',
      isFullscreen && 'lg:grid-cols-[minmax(260px,22%)_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] lg:gap-5 xl:gap-6',
    ),
    rail: cn(
      'flex min-h-0 flex-col gap-0',
      !isModal && 'lg:sticky lg:top-0 lg:self-start',
    ),
    stage: 'flex min-h-0 min-w-0 flex-col gap-3 sm:gap-4',
    stageGrid: cn(
      'grid min-w-0 gap-3 sm:gap-4',
      'grid-cols-1',
      isEmbedded && 'lg:grid-cols-[minmax(0,1fr)_minmax(240px,30%)]',
      isFullscreen && 'xl:grid-cols-[minmax(0,1fr)_minmax(280px,32%)]',
    ),
    sequenceScroll: cn(
      'min-h-0',
      isModal && 'max-h-[min(48vh,440px)] overflow-y-auto overscroll-contain pr-0.5 md:max-h-[min(54vh,480px)]',
      isEmbedded && 'max-h-[min(45vh,380px)] overflow-y-auto overscroll-contain pr-0.5 lg:max-h-[calc(100vh-300px)]',
      isFullscreen && 'max-h-[min(50vh,440px)] overflow-y-auto overscroll-contain pr-0.5 xl:max-h-[calc(100vh-260px)]',
    ),
    mapPool: {
      gridCols: isModal
        ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
        : isFullscreen
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4',
      tileHeight: isModal
        ? 'h-32 sm:h-36 md:h-40'
        : isFullscreen
          ? 'h-28 sm:h-32 md:h-36 lg:h-40 xl:h-44'
          : 'h-24 sm:h-32 md:h-36 lg:h-40',
      minHeight: isModal ? '7rem' : '7.5rem',
      gap: isModal ? 'gap-2.5 sm:gap-3' : 'gap-2.5 sm:gap-3',
      mapNameSize: isModal
        ? 'text-sm sm:text-base md:text-lg'
        : 'text-base sm:text-lg md:text-xl lg:text-2xl',
    },
    headerCompact: isModal || isEmbedded,
    teamCompact: isModal || isEmbedded,
    selectedMapsCompact: !isComplete && (isModal || isEmbedded),
    sequenceCompact: true,
    sequenceColumns: isComplete,
  };
}
