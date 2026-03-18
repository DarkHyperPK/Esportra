import React from "react";
import Footer from "@/components/Footer";
import HeroV2 from "@/components/landing/v2/HeroV2";
import StatsBar from "@/components/landing/v2/StatsBar";
import FeaturesV2 from "@/components/landing/v2/FeaturesV2";
import WhyEsportra from "@/components/landing/v2/WhyEsportra";
import CTASection from "@/components/landing/v2/CTASection";
import LogoTicker from "@/components/landing/LogoTicker";

const Index = () => {
    return (
        <div className="bg-[#050505]">
            <HeroV2 />
            <LogoTicker />
            <StatsBar />
            <FeaturesV2 />
            <WhyEsportra />
            <CTASection />
            <Footer />
        </div>
    );
};

export default Index;
