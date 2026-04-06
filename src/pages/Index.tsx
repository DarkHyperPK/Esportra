import React from "react";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import LogoTicker from "@/components/landing/LogoTicker";
import TheManifesto from "@/components/landing/TheManifesto";
import PlatformPromise from "@/components/landing/PlatformPromise";
import SupportedGames from "@/components/landing/SupportedGames";
import VenueShowcase from "@/components/landing/VenueShowcase";
import VenueCallToAction from "@/components/landing/VenueCallToAction";
import TheHeartbeat from "@/components/landing/TheHeartbeat";
import Roadmap from "@/components/landing/Roadmap";
import PremiumBackground from "@/components/ui/PremiumBackground";
import SEO from '@/components/SEO';

const Index = () => {
    return (
        <PremiumBackground animated intensity={0.12}>
            <SEO url="/" />
            <HeroSection />



            <LogoTicker />
            <TheManifesto />
            <FeaturesSection />
            <SupportedGames />
            <VenueShowcase />
            <VenueCallToAction />
            <TheHeartbeat />
            <PlatformPromise />
            <Roadmap />
            <Footer />
        </PremiumBackground>
    );
};

export default Index;
