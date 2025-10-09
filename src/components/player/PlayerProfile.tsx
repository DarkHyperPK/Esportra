import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Edit, Medal, Trophy, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const PlayerProfile = () => {
  const { profile } = useAuth();
  const [editMode, setEditMode] = useState(false);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h2 className="text-2xl font-bold mb-2">My Profile</h2>
        <Button variant="outline" onClick={() => setEditMode(!editMode)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xl font-bold">Player Info</CardTitle>
            <Badge className="bg-gaming-purple">Level 24</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mt-2">
              <Avatar src={profile?.avatar_url} name={profile?.full_name || profile?.username} size={80} className="mb-4" />
              <h3 className="text-xl font-bold">{profile?.username}</h3>
              <p className="text-gray-400">{profile?.full_name}</p>
              
              <div className="mt-6 space-y-3 w-full">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Email</div>
                  <div>{profile?.email}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Discord</div>
                  <div>playername#1234</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Member Since</div>
                  <div>April 2025</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold">Game Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 border border-gaming-gray/30 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img src="https://via.placeholder.com/30" alt="Valorant" className="mr-3 rounded-full" />
                    <div>
                      <div className="font-medium">Valorant</div>
                      <div className="text-sm text-gray-400">ProPlayer#NA1</div>
                    </div>
                  </div>
                  <Badge className="bg-amber-500">Diamond</Badge>
                </div>
              </div>
              
              <div className="p-3 border border-gaming-gray/30 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img src="https://via.placeholder.com/30" alt="League of Legends" className="mr-3 rounded-full" />
                    <div>
                      <div className="font-medium">League of Legends</div>
                      <div className="text-sm text-gray-400">ProPlayer#NA1</div>
                    </div>
                  </div>
                  <Badge className="bg-gaming-blue">Platinum</Badge>
                </div>
              </div>
              
              <Button variant="outline" className="w-full mt-2">
                <Edit className="mr-2 h-4 w-4" />
                Link New Account
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold">Player Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-esports-dark p-3 rounded-md text-center">
                <Trophy className="mx-auto h-8 w-8 text-yellow-500 mb-1" />
                <div className="text-xl font-bold">12</div>
                <div className="text-sm text-gray-400">Tournaments</div>
              </div>
              
              <div className="bg-esports-dark p-3 rounded-md text-center">
                <Medal className="mx-auto h-8 w-8 text-amber-500 mb-1" />
                <div className="text-xl font-bold">4</div>
                <div className="text-sm text-gray-400">Wins</div>
              </div>
              
              <div className="bg-esports-dark p-3 rounded-md text-center">
                <Star className="mx-auto h-8 w-8 text-purple-500 mb-1" />
                <div className="text-xl font-bold">872</div>
                <div className="text-sm text-gray-400">Points</div>
              </div>
              
              <div className="bg-esports-dark p-3 rounded-md text-center">
                <div className="text-xl font-bold">33%</div>
                <div className="text-sm text-gray-400">Win Rate</div>
                <div className="w-full bg-gaming-gray/20 h-2 mt-2 rounded-full overflow-hidden">
                  <div className="bg-gaming-purple h-2 rounded-full" style={{ width: '33%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlayerProfile;
