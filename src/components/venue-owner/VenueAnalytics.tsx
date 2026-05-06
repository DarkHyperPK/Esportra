
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useVenueSearch } from '@/hooks/useVenueSearch';
import { useVenueImpressionsData, useVenueImpressionTotals } from '@/hooks/useVenueImpressions';
import { useAuth } from '@/contexts/AuthContext';

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: 'white',
  },
};

const VenueAnalytics = () => {
  const { user } = useAuth();
  const { venues, loading: venuesLoading } = useVenueSearch({ includeOwned: true });

  // Filter to only the current user's venues
  const ownedVenues = venues.filter((v) => v.owner_id === user?.id);

  const [selectedVenueId, setSelectedVenueId] = useState<string>('');

  // Use first venue if none selected yet
  const activeVenueId = selectedVenueId || ownedVenues[0]?.id || '';

  const { data: dailyData, isLoading: dailyLoading } = useVenueImpressionsData(activeVenueId, 30);
  const { data: totals, isLoading: totalsLoading } = useVenueImpressionTotals(activeVenueId);

  const isLoading = venuesLoading || dailyLoading || totalsLoading;

  // Shape data for charts
  const viewsData = (dailyData ?? []).map((d) => ({ name: d.date.slice(5), views: d.views }));
  const bookingsData = (dailyData ?? []).map((d) => ({
    name: d.date.slice(5),
    clicks: d.booking_clicks,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Venue Analytics</h2>
        {ownedVenues.length > 0 && (
          <Select
            value={activeVenueId}
            onValueChange={setSelectedVenueId}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select venue" />
            </SelectTrigger>
            <SelectContent>
              {ownedVenues.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#0a0a0c] border-white/10/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            ) : (
              <div className="text-3xl font-bold">{totals?.views ?? 0}</div>
            )}
            <p className="text-sm text-gray-500">Page views</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0c] border-white/10/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Card Views</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            ) : (
              <div className="text-3xl font-bold">{totals?.card_views ?? 0}</div>
            )}
            <p className="text-sm text-gray-500">Search impressions</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0c] border-white/10/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Booking Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            ) : (
              <div className="text-3xl font-bold">{totals?.booking_clicks ?? 0}</div>
            )}
            <p className="text-sm text-gray-500">Intent signals</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0c] border-white/10/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Contact Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            ) : (
              <div className="text-3xl font-bold">{totals?.contact_clicks ?? 0}</div>
            )}
            <p className="text-sm text-gray-500">Inquiries</p>
          </CardContent>
        </Card>
      </div>

      {!activeVenueId ? (
        <div className="rounded-xl border border-white/10/30 bg-[#0a0a0c] p-12 text-center text-gray-500">
          {venuesLoading ? (
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          ) : (
            'No venues found. List your first venue to see analytics.'
          )}
        </div>
      ) : (
        <Tabs defaultValue="views">
          <TabsList className="mb-6">
            <TabsTrigger value="views">Views (30 days)</TabsTrigger>
            <TabsTrigger value="bookings">Booking Clicks</TabsTrigger>
          </TabsList>

          <TabsContent value="views">
            <Card className="bg-[#0a0a0c] border-white/10/30">
              <CardHeader>
                <CardTitle>Daily Views</CardTitle>
                <CardDescription>Venue page views over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : viewsData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-gray-500 text-sm">
                    No view data yet. Share your venue page to start tracking.
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={viewsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#888" allowDecimals={false} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Line
                          type="monotone"
                          dataKey="views"
                          stroke="#8B5CF6"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="bg-[#0a0a0c] border-white/10/30">
              <CardHeader>
                <CardTitle>Booking Click-throughs</CardTitle>
                <CardDescription>Users who clicked "Book Now" each day</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : bookingsData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-gray-500 text-sm">
                    No booking click data yet.
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bookingsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#888" allowDecimals={false} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Bar dataKey="clicks" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default VenueAnalytics;

