import React from "react";
import Footer from "@/components/Footer";
// import HeroSection from "@/components/HeroSection"; // V1 — kept as backup
import HeroSectionV2 from "@/components/HeroSectionV2";
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
            <HeroSectionV2 />



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
