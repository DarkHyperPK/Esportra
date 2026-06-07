import { JackButton } from "@/components/ui/JackButton";
import { Link, useParams } from "react-router-dom";

const sampleCards = ["Tournament Control", "Venue Booking", "Match Operations"];

const textureOptions = [
  {
    label: "Option 1",
    title: "Original ripped streaks",
    description: "Closest to your reference: aggressive organic black/grey tearing, but generated as original CSS shapes.",
    layers: (
      <>
        <div className="absolute inset-0 bg-[#0a0a0c]" />
        <div className="absolute -left-[8%] top-[-12%] h-[135%] w-[18%] rotate-[-18deg] bg-white/16 [clip-path:polygon(40%_0,72%_0,58%_18%,78%_31%,49%_56%,70%_74%,35%_100%,10%_100%,34%_72%,12%_50%,42%_26%)]" />
        <div className="absolute left-[10%] top-[-8%] h-[130%] w-[13%] rotate-[-9deg] bg-white/10 [clip-path:polygon(38%_0,88%_0,55%_21%,73%_45%,48%_70%,62%_100%,18%_100%,35%_67%,12%_46%,44%_23%)]" />
        <div className="absolute left-[26%] top-[-16%] h-[145%] w-[17%] rotate-[3deg] bg-white/18 [clip-path:polygon(32%_0,70%_0,66%_16%,82%_32%,61%_52%,76%_72%,43%_100%,5%_100%,27%_77%,10%_58%,35%_34%)]" />
        <div className="absolute left-[45%] top-[-10%] h-[135%] w-[16%] rotate-[8deg] bg-white/12 [clip-path:polygon(20%_0,68%_0,55%_24%,84%_41%,52%_61%,66%_100%,22%_100%,35%_72%,9%_54%,38%_27%)]" />
        <div className="absolute left-[64%] top-[-14%] h-[142%] w-[15%] rotate-[15deg] bg-white/15 [clip-path:polygon(44%_0,90%_0,63%_19%,82%_42%,55%_62%,74%_100%,28%_100%,36%_79%,14%_58%,42%_31%)]" />
        <div className="absolute right-[-4%] top-[-9%] h-[136%] w-[20%] rotate-[24deg] bg-white/11 [clip-path:polygon(31%_0,72%_0,52%_23%,82%_44%,48%_66%,66%_100%,21%_100%,35%_75%,4%_54%,34%_29%)]" />
      </>
    ),
  },
  {
    label: "Option 2",
    title: "Rose-tinted tear marks",
    description: "Same ripped texture direction, but with very subtle rose atmosphere for stronger Esportra branding.",
    layers: (
      <>
        <div className="absolute inset-0 bg-[#0a0a0c]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(244,63,94,0.14),transparent_40%)]" />
        <div className="absolute -left-[6%] top-[-10%] h-[140%] w-[14%] rotate-[-22deg] bg-rose-500/13 [clip-path:polygon(48%_0,78%_0,61%_27%,86%_46%,50%_68%,72%_100%,22%_100%,34%_76%,8%_52%,38%_30%)]" />
        <div className="absolute left-[15%] top-[-13%] h-[138%] w-[16%] rotate-[-6deg] bg-white/12 [clip-path:polygon(35%_0,82%_0,53%_20%,77%_40%,48%_65%,65%_100%,18%_100%,33%_73%,13%_50%,42%_26%)]" />
        <div className="absolute left-[39%] top-[-8%] h-[132%] w-[15%] rotate-[6deg] bg-rose-500/10 [clip-path:polygon(24%_0,70%_0,57%_18%,83%_37%,54%_59%,71%_100%,23%_100%,36%_71%,7%_55%,37%_28%)]" />
        <div className="absolute left-[59%] top-[-16%] h-[146%] w-[18%] rotate-[17deg] bg-white/14 [clip-path:polygon(40%_0,88%_0,62%_22%,79%_43%,58%_64%,80%_100%,35%_100%,33%_82%,12%_57%,43%_33%)]" />
        <div className="absolute right-[-8%] top-[-11%] h-[140%] w-[21%] rotate-[29deg] bg-rose-500/12 [clip-path:polygon(38%_0,76%_0,56%_25%,88%_43%,52%_69%,69%_100%,19%_100%,34%_77%,3%_55%,35%_31%)]" />
      </>
    ),
  },
  {
    label: "Option 3",
    title: "Low-contrast global streaks",
    description: "Safest for the full platform. Keeps the pattern visible but quiet behind dense pages and cards.",
    layers: (
      <>
        <div className="absolute inset-0 bg-[#0a0a0c]" />
        <div className="absolute inset-0 opacity-60">
          <div className="absolute -left-[10%] top-[-15%] h-[145%] w-[20%] rotate-[-17deg] bg-white/[0.075] [clip-path:polygon(44%_0,69%_0,53%_24%,76%_42%,49%_64%,67%_100%,23%_100%,35%_78%,12%_53%,38%_29%)]" />
          <div className="absolute left-[18%] top-[-9%] h-[132%] w-[13%] rotate-[-4deg] bg-white/[0.065] [clip-path:polygon(30%_0,84%_0,52%_19%,74%_46%,45%_69%,62%_100%,15%_100%,35%_76%,10%_51%,44%_26%)]" />
          <div className="absolute left-[38%] top-[-18%] h-[150%] w-[18%] rotate-[5deg] bg-white/[0.08] [clip-path:polygon(36%_0,75%_0,62%_18%,85%_35%,57%_58%,72%_100%,30%_100%,34%_80%,8%_56%,39%_31%)]" />
          <div className="absolute left-[68%] top-[-12%] h-[138%] w-[17%] rotate-[19deg] bg-white/[0.07] [clip-path:polygon(39%_0,88%_0,64%_21%,80%_46%,54%_67%,72%_100%,27%_100%,37%_78%,10%_54%,41%_28%)]" />
        </div>
      </>
    ),
  },
  {
    label: "Option 4",
    title: "Bottom-rising slash texture",
    description: "More dramatic, like energy tearing upward from the bottom. Better for public pages than dashboards.",
    layers: (
      <>
        <div className="absolute inset-0 bg-[#0a0a0c]" />
        <div className="absolute inset-x-0 bottom-0 h-[88%] bg-[radial-gradient(circle_at_50%_100%,rgba(244,63,94,0.12),transparent_42%)]" />
        <div className="absolute bottom-[-8%] left-[-4%] h-[96%] w-[16%] rotate-[-30deg] bg-white/13 [clip-path:polygon(32%_0,65%_0,78%_100%,19%_100%,45%_63%)]" />
        <div className="absolute bottom-[-10%] left-[14%] h-[102%] w-[14%] rotate-[-14deg] bg-white/10 [clip-path:polygon(40%_0,76%_0,63%_100%,14%_100%,50%_61%)]" />
        <div className="absolute bottom-[-7%] left-[34%] h-[92%] w-[16%] rotate-[2deg] bg-white/15 [clip-path:polygon(30%_0,66%_0,82%_100%,22%_100%,47%_55%)]" />
        <div className="absolute bottom-[-12%] left-[55%] h-[108%] w-[15%] rotate-[17deg] bg-white/11 [clip-path:polygon(38%_0,78%_0,63%_100%,16%_100%,52%_58%)]" />
        <div className="absolute bottom-[-9%] right-[-5%] h-[100%] w-[20%] rotate-[32deg] bg-white/14 [clip-path:polygon(29%_0,68%_0,84%_100%,20%_100%,46%_61%)]" />
      </>
    ),
  },
];

const BackgroundPreview = () => {
  const { option } = useParams<{ option?: string }>();
  const selectedIndex = option ? Number(option) - 1 : -1;
  const selectedOption = selectedIndex >= 0 ? textureOptions[selectedIndex] : undefined;

  if (selectedOption) {
    return <FullscreenBackgroundOption option={selectedOption} optionNumber={selectedIndex + 1} />;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0c] px-6 py-28 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="border border-white/10 bg-black/50 p-6">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-rose-500">
            Temporary Local Preview
          </p>
          <h1 className="mt-3 font-heading text-4xl font-black uppercase tracking-tight md:text-6xl">
            Global Platform Texture Options
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/55">
            These are texture-style backgrounds for the global app shell behind page content, not landing page hero images.
          </p>
          <div className="mt-6">
            <JackButton as={Link} to="/" variant="primary" size="md">
              Back Home
            </JackButton>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {textureOptions.map((option, index) => (
            <BackgroundOption key={option.label} optionNumber={index + 1} {...option} />
          ))}
        </div>
      </div>
    </main>
  );
};

const BackgroundOption = ({
  optionNumber,
  label,
  title,
  description,
  layers,
}: {
  optionNumber: number;
  label: string;
  title: string;
  description: string;
  layers: React.ReactNode;
}) => {
  return (
    <section className="overflow-hidden border border-white/10 bg-black">
      <div className="relative min-h-[440px]">
        {layers}
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 flex min-h-[440px] flex-col justify-between p-6">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-500">{label}</p>
            <h2 className="mt-3 font-heading text-3xl font-black uppercase tracking-tight text-white">{title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">{description}</p>
            <div className="mt-5">
              <JackButton as={Link} to={`/dev/background-preview/${optionNumber}`} variant="primary" size="sm">
                Fullscreen Preview
              </JackButton>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {sampleCards.map((card) => (
              <div key={card} className="border border-white/10 bg-[#0a0a0c]/90 p-4">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-white/35">
                  Preview Card
                </p>
                <h3 className="mt-2 text-sm font-bold uppercase text-white">{card}</h3>
                <div className="mt-4 h-1 bg-rose-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const FullscreenBackgroundOption = ({
  option,
  optionNumber,
}: {
  option: (typeof textureOptions)[number];
  optionNumber: number;
}) => {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {option.layers}
      <div className="absolute inset-0 bg-black/12" />
      <div className="relative z-10 min-h-screen px-6 py-28">
        <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-7xl flex-col justify-between">
          <div className="max-w-3xl border border-white/10 bg-[#0a0a0c]/88 p-8">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-rose-500">
              Fullscreen Preview / Option {optionNumber}
            </p>
            <h1 className="mt-4 font-heading text-5xl font-black uppercase tracking-tight md:text-7xl">
              {option.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60">
              {option.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <JackButton as={Link} to="/dev/background-preview" variant="primary" size="md">
                Back To Options
              </JackButton>
              <JackButton as={Link} to="/" variant="invert" size="md">
                View Home
              </JackButton>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {sampleCards.map((card) => (
              <div key={card} className="border border-white/10 bg-[#0a0a0c]/90 p-5">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-white/35">
                  Global Background Test
                </p>
                <h2 className="mt-3 text-lg font-bold uppercase text-white">{card}</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/45">
                  This card shows how real platform content reads over the selected texture.
                </p>
                <div className="mt-5 h-1 bg-rose-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default BackgroundPreview;
