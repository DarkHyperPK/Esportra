
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

const ListVenue = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    description: '',
    stations: '',
    hours: '',
    games: '',
    contactEmail: '',
    contactPhone: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to list a venue",
        variant: "destructive",
      });
      navigate('/auth/signin');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('venues')
        .insert({
          user_id: user.id,
          name: formData.name,
          city: formData.city,
          address: formData.address,
          description: formData.description,
          stations: parseInt(formData.stations) || 0,
          hours: formData.hours,
          games: formData.games,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your venue has been submitted successfully!",
      });
      
      navigate('/venues/search');
    } catch (error: any) {
      console.error('Error submitting venue:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">List Your Gaming Venue</h1>
          
          <div className="bg-gaming-dark p-6 rounded-lg border border-gaming-gray/30">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Venue Name</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter venue name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Enter city"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter full address"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="h-32 bg-esports-dark border-gaming-gray/30 focus:ring-gaming-purple"
                  placeholder="Describe your venue, amenities, and special features"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Gaming Stations</label>
                  <Input
                    name="stations"
                    type="number"
                    value={formData.stations}
                    onChange={handleChange}
                    placeholder="Enter number of stations"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Operating Hours</label>
                  <Input
                    name="hours"
                    value={formData.hours}
                    onChange={handleChange}
                    placeholder="e.g., 9 AM - 11 PM"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Available Games</label>
                <Input
                  name="games"
                  value={formData.games}
                  onChange={handleChange}
                  placeholder="List main games available"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contact Email</label>
                <Input
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="Enter contact email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contact Phone</label>
                <Input
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="Enter contact phone number"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gaming-purple hover:bg-gaming-purple/80"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Venue'}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ListVenue;
