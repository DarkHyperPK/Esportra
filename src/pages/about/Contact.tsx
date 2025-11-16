
import React from 'react';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const ContactPage = () => {
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent",
      description: "We'll get back to you as soon as possible!",
    });
  };

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Contact Esportra</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-xl font-bold mb-4">Get in Touch</h2>
              <p className="text-gray-300 mb-6">
                Have questions about Esportra? We're here to help! Fill out the form and we'll get back to you as soon as possible.
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold mb-2">Email</h3>
                  <p className="text-gray-300">support@esportra.com</p>
                </div>
                <div>
                  <h3 className="font-bold mb-2">Office</h3>
                  <p className="text-gray-300">
                    123 Gaming Street<br />
                    San Francisco, CA 94105<br />
                    United States
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gaming-dark p-6 rounded-lg border border-gaming-gray/30">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input type="email" placeholder="Your email" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subject</label>
                  <Input placeholder="Subject" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <Textarea placeholder="Your message" className="h-32" />
                </div>
                <Button type="submit" className="w-full bg-gaming-purple hover:bg-gaming-purple/80">
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
