import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { profileApi, tournamentApi, venueApi, bookingApi, roleApi } from '@/services/api';

const TestDatabase = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [results, setResults] = useState<{ [key: string]: any }>({});

  const testFunction = async (name: string, func: () => Promise<any>) => {
    try {
      setLoading(prev => ({ ...prev, [name]: true }));
      const result = await func();
      setResults(prev => ({ ...prev, [name]: result }));
      toast({
        title: `${name} Test Successful`,
        description: 'The test completed successfully.',
      });
    } catch (error: any) {
      console.error(`Error in ${name}:`, error);
      toast({
        title: `${name} Test Failed`,
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  const testProfiles = async () => {
    if (!user) throw new Error('User not authenticated');
    return await profileApi.getProfile(user.id);
  };

  const testTournaments = async () => {
    return await tournamentApi.getTournaments();
  };

  const testVenues = async () => {
    return await venueApi.getVenues();
  };

  const testBookings = async () => {
    if (!user) throw new Error('User not authenticated');
    return await bookingApi.getBookings(user.id);
  };

  const testRoles = async () => {
    if (!user) throw new Error('User not authenticated');
    return await roleApi.getUserRole(user.id);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Database Test Page</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Tests</CardTitle>
            <CardDescription>Test profile-related database functions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => testFunction('profiles', testProfiles)}
              disabled={loading['profiles']}
              className="mr-4"
            >
              {loading['profiles'] ? 'Testing...' : 'Test Profiles'}
            </Button>
            {results['profiles'] && (
              <pre className="mt-4 p-4 bg-gray-100 rounded">
                {JSON.stringify(results['profiles'], null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tournament Tests</CardTitle>
            <CardDescription>Test tournament-related database functions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => testFunction('tournaments', testTournaments)}
              disabled={loading['tournaments']}
              className="mr-4"
            >
              {loading['tournaments'] ? 'Testing...' : 'Test Tournaments'}
            </Button>
            {results['tournaments'] && (
              <pre className="mt-4 p-4 bg-gray-100 rounded">
                {JSON.stringify(results['tournaments'], null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Venue Tests</CardTitle>
            <CardDescription>Test venue-related database functions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => testFunction('venues', testVenues)}
              disabled={loading['venues']}
              className="mr-4"
            >
              {loading['venues'] ? 'Testing...' : 'Test Venues'}
            </Button>
            {results['venues'] && (
              <pre className="mt-4 p-4 bg-gray-100 rounded">
                {JSON.stringify(results['venues'], null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Tests</CardTitle>
            <CardDescription>Test booking-related database functions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => testFunction('bookings', testBookings)}
              disabled={loading['bookings']}
              className="mr-4"
            >
              {loading['bookings'] ? 'Testing...' : 'Test Bookings'}
            </Button>
            {results['bookings'] && (
              <pre className="mt-4 p-4 bg-gray-100 rounded">
                {JSON.stringify(results['bookings'], null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Tests</CardTitle>
            <CardDescription>Test role-related database functions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => testFunction('roles', testRoles)}
              disabled={loading['roles']}
              className="mr-4"
            >
              {loading['roles'] ? 'Testing...' : 'Test Roles'}
            </Button>
            {results['roles'] && (
              <pre className="mt-4 p-4 bg-gray-100 rounded">
                {JSON.stringify(results['roles'], null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestDatabase; 