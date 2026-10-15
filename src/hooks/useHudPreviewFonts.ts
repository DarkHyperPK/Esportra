import { useQuery } from "@tanstack/react-query";
const fonts = [
  { file: "Poppins-Black.ttf", family: "PBk", weight: "400" },
  { file: "Poppins-ExtraBold.ttf", family: "PXB", weight: "400" },
  { file: "Poppins-Bold.ttf", family: "PBd", weight: "400" },
  { file: "Poppins-SemiBold.ttf", family: "PSB", weight: "400" },
  { file: "Poppins-Medium.ttf", family: "PMd", weight: "400" },
  { file: "Poppins-LightItalic.ttf", family: "PLI", weight: "400" },
  { file: "rajdhani-700.ttf", family: "EsportraRajdhani", weight: "700" },
  { file: "montserrat-600.ttf", family: "EsportraMontserrat", weight: "600" },
  { file: "JetBrainsMono.ttf", family: "JB", weight: "400" },
];
/** The sandbox has an opaque origin. Pass public font bytes rather than granting parent-origin access. */
export function useHudPreviewFonts(enabled: boolean) {
  return useQuery({
    queryKey: ["broadcast-hud-preview-fonts"],
    enabled,
    staleTime: Infinity,
    queryFn: () =>
      Promise.all(
        fonts.map(async (font) => {
          const response = await fetch(`/air-hud/core/fonts/${font.file}`, {
            credentials: "omit",
          });
          if (!response.ok) throw new Error("Preview font unavailable.");
          return {
            family: font.family,
            weight: font.weight,
            buffer: await response.arrayBuffer(),
          };
        }),
      ),
  });
}
