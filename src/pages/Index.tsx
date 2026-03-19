import React from "react";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
// import HeroSectionV2 from "@/components/HeroSectionV2";
// import HeroSectionV3 from "@/components/HeroSectionV3";
// import HeroSectionV4 from "@/components/HeroSectionV4";
// import HeroSectionV5 from "@/components/HeroSectionV5";
// import HeroSectionV6 from "@/components/HeroSectionV6";
// import HeroSectionV7 from "@/components/HeroSectionV7";
// import HeroSectionV9 from "@/components/HeroSectionV9";
// import HeroSectionV11 from "@/components/HeroSectionV11";
// import HeroSectionV12 from "@/components/HeroSectionV12";
// import HeroSectionV13 from "@/components/HeroSectionV13";
import FeaturesSection from "@/components/landing/FeaturesSection";
import LogoTicker from "@/components/landing/LogoTicker";
import TheManifesto from "@/components/landing/TheManifesto";
import PlatformPromise from "@/components/landing/PlatformPromise";
import TheHeartbeat from "@/components/landing/TheHeartbeat";
import Roadmap from "@/components/landing/Roadmap";
import PremiumBackground from "@/components/ui/PremiumBackground";

const Index = () => {
    return (
        <PremiumBackground animated intensity={0.12}>
            <HeroSection />



            <LogoTicker />
            <TheManifesto />
            <FeaturesSection />
            <TheHeartbeat />
            <PlatformPromise />
            <Roadmap />
            <Footer />
        </PremiumBackground>
    );
};

export default Index;
