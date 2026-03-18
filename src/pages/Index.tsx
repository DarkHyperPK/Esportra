import Footer from "@/components/Footer";
import LogoTicker from "@/components/landing/LogoTicker";
import NavbarV3 from "@/components/landing/v3/NavbarV3";
import HeroV3 from "@/components/landing/v3/HeroV3";
import LiveTicker from "@/components/landing/v3/LiveTicker";
import GameShowcase from "@/components/landing/v3/GameShowcase";
import JourneySection from "@/components/landing/v3/JourneySection";
import SocialProof from "@/components/landing/v3/SocialProof";
import CTABanner from "@/components/landing/v3/CTABanner";

const Index = () => {
    return (
        <div className="bg-[#050505]">
            <NavbarV3 />
            <HeroV3 />
            <LiveTicker />
            <LogoTicker />
            <GameShowcase />
            <JourneySection />
            <SocialProof />
            <CTABanner />
            <Footer />
        </div>
    );
};

export default Index;
