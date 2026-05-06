
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Trophy, Medal, Award, Star, Target } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  unlocked: boolean;
  game: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  date?: string;
}

const mockAchievements: Achievement[] = [
  {
    id: 'a1',
    name: 'First Blood',
    description: 'Win your first tournament',
    icon: <Trophy className="h-8 w-8 text-yellow-500" />,
    progress: 100,
    unlocked: true,
    game: 'Valorant',
    rarity: 'common',
    date: '2023-03-15',
  },
  {
    id: 'a2',
    name: 'Sharpshooter',
    description: 'Achieve a headshot accuracy of over 40% in a tournament',
    icon: <Target className="h-8 w-8 text-green-500" />,
    progress: 100,
    unlocked: true,
    game: 'Valorant',
    rarity: 'uncommon',
    date: '2023-04-02',
  },
  {
    id: 'a3',
    name: 'Tournament Champion',
    description: 'Win 5 tournaments',
    icon: <Trophy className="h-8 w-8 text-yellow-500" />,
    progress: 60,
    unlocked: false,
    game: 'Valorant',
    rarity: 'rare',
  },
  {
    id: 'a4',
    name: 'Team Leader',
    description: 'Create and lead a team to victory',
    icon: <Award className="h-8 w-8 text-blue-500" />,
    progress: 100,
    unlocked: true,
    game: 'League of Legends',
    rarity: 'uncommon',
    date: '2023-03-28',
  },
  {
    id: 'a5',
    name: 'Venue Regular',
    description: 'Book 10 different gaming venues',
    icon: <Medal className="h-8 w-8 text-purple-500" />,
    progress: 40,
    unlocked: false,
    game: 'All Games',
    rarity: 'uncommon',
  },
  {
    id: 'a6',
    name: 'Legendary Status',
    description: 'Win 3 tournaments in a row',
    icon: <Star className="h-8 w-8 text-yellow-500" />,
    progress: 0,
    unlocked: false,
    game: 'All Games',
    rarity: 'legendary',
  },
];

const rarityColors = {
  common: 'border-gray-500',
  uncommon: 'border-green-500',
  rare: 'border-blue-500',
  legendary: 'border-purple-500',
};

const PlayerAchievements = () => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  
  const filteredAchievements = mockAchievements.filter(achievement => {
    if (filter === 'all') return true;
    if (filter === 'unlocked') return achievement.unlocked;
    if (filter === 'locked') return !achievement.unlocked;
    return true;
  });
  
  return (
    <div className="space-y-6">
      <Card className="bg-[#0a0a0c] border-white/10/30">
        <CardHeader>
          <CardTitle>Your Gaming Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as any)}>
            <div className="flex items-center justify-between mb-6">
              <TabsList className="bg-zinc-800/10">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
                <TabsTrigger value="locked">In Progress</TabsTrigger>
              </TabsList>
              <div className="text-sm text-gray-400">
                <span className="font-bold text-white">
                  {mockAchievements.filter(a => a.unlocked).length}
                </span>
                /{mockAchievements.length} Achievements Unlocked
              </div>
            </div>
            
            <TabsContent value="all" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAchievements.map(achievement => (
                  <div 
                    key={achievement.id} 
                    className={`p-4 border-2 rounded-lg ${rarityColors[achievement.rarity]} ${
                      achievement.unlocked ? 'bg-zinc-800/10' : 'bg-zinc-800/5'
                    }`}
                  >
                    <div className="flex items-center mb-3">
                      {achievement.icon}
                      <div className="ml-3">
                        <div className="font-bold">{achievement.name}</div>
                        <div className="text-xs text-gray-400">{achievement.game} • {achievement.rarity}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">
                      {achievement.description}
                    </p>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>{achievement.unlocked ? 'Completed' : `${achievement.progress}% Complete`}</span>
                      {achievement.date && <span>{achievement.date}</span>}
                    </div>
                    <Progress value={achievement.progress} className="h-1" />
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="unlocked" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAchievements.map(achievement => (
                  <div 
                    key={achievement.id} 
                    className={`p-4 border-2 rounded-lg ${rarityColors[achievement.rarity]} bg-zinc-800/10`}
                  >
                    <div className="flex items-center mb-3">
                      {achievement.icon}
                      <div className="ml-3">
                        <div className="font-bold">{achievement.name}</div>
                        <div className="text-xs text-gray-400">{achievement.game} • {achievement.rarity}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">
                      {achievement.description}
                    </p>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Completed</span>
                      <span>{achievement.date}</span>
                    </div>
                    <Progress value={100} className="h-1" />
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="locked" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAchievements.map(achievement => (
                  <div 
                    key={achievement.id} 
                    className={`p-4 border-2 rounded-lg ${rarityColors[achievement.rarity]} bg-zinc-800/5`}
                  >
                    <div className="flex items-center mb-3">
                      {achievement.icon}
                      <div className="ml-3">
                        <div className="font-bold">{achievement.name}</div>
                        <div className="text-xs text-gray-400">{achievement.game} • {achievement.rarity}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">
                      {achievement.description}
                    </p>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>{achievement.progress}% Complete</span>
                    </div>
                    <Progress value={achievement.progress} className="h-1" />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerAchievements;

