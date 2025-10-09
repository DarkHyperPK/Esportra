
import React from 'react';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button'; // Add the missing Button import
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQPage = () => {
  const faqs = [
    {
      question: "What is GamerSpot?",
      answer: "GamerSpot is a platform connecting gamers with gaming venues and tournaments. We help you discover places to play, compete in tournaments, and connect with other gamers."
    },
    {
      question: "How do I book a venue?",
      answer: "You can search for venues using our venue finder, filter by location and amenities, and book directly through our platform. Most venues offer hourly rates and special packages."
    },
    {
      question: "Can I host a tournament?",
      answer: "Yes! Registered venues and organizers can host tournaments through our platform. You'll need to create an organizer account and submit your tournament details for approval."
    },
    {
      question: "How do I join a tournament?",
      answer: "Browse our tournaments section, find one you're interested in, and click 'Register'. You'll need to create an account if you haven't already, and follow the tournament-specific registration steps."
    },
    {
      question: "What games are supported?",
      answer: "We support all major esports titles and popular gaming platforms. Venues list their available games and equipment in their profiles."
    }
  ];

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Frequently Asked Questions</h1>
          
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          <div className="mt-12 p-6 bg-gaming-dark rounded-lg border border-gaming-gray/30">
            <h2 className="text-xl font-bold mb-4">Still have questions?</h2>
            <p className="text-gray-300 mb-4">
              Can't find the answer you're looking for? Please reach out to our support team.
            </p>
            <Button className="bg-gaming-purple hover:bg-gaming-purple/80">
              Contact Support
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQPage;
