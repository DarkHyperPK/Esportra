
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

const TournamentBrackets = () => {
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Tournament Brackets</h2>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <Select defaultValue="valorant">
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Select tournament" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="valorant">Summer Valorant Showdown</SelectItem>
              <SelectItem value="league">League Championship Series</SelectItem>
              <SelectItem value="apex">Apex Legends Tournament</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-full md:w-auto">
            Create New Bracket
          </Button>
        </div>
      </div>

      <Tabs defaultValue="single-elimination">
        <TabsList className="mb-6">
          <TabsTrigger value="single-elimination">Single Elimination</TabsTrigger>
          <TabsTrigger value="double-elimination">Double Elimination</TabsTrigger>
          <TabsTrigger value="round-robin">Round Robin</TabsTrigger>
        </TabsList>

        <TabsContent value="single-elimination">
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle>Single Elimination Bracket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-auto">
                {/* This would be replaced with a real bracket visualization component */}
                <div className="min-w-[800px] py-6">
                  <div className="flex justify-between">
                    <div className="w-full">
                      <h4 className="text-center text-sm text-gray-400 mb-2">Quarter Finals</h4>
                      <div className="space-y-8">
                        <div className="flex flex-col gap-2">
                          <div className="border border-gaming-gray/30 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                              <div>Team Alpha</div>
                              <div className="font-bold">2</div>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <div>Team Beta</div>
                              <div>0</div>
                            </div>
                          </div>

                          <div className="border border-gaming-gray/30 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                              <div>Team Delta</div>
                              <div className="font-bold">2</div>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <div>Team Gamma</div>
                              <div>1</div>
                            </div>
                          </div>

                          <div className="border border-gaming-gray/30 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                              <div>Team Epsilon</div>
                              <div>0</div>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <div>Team Zeta</div>
                              <div className="font-bold">2</div>
                            </div>
                          </div>

                          <div className="border border-gaming-gray/30 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                              <div>Team Theta</div>
                              <div className="font-bold">2</div>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <div>Team Kappa</div>
                              <div>0</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center mx-4">
                      <div className="border-t-2 border-b-2 border-r-2 border-gaming-gray/30 h-64 w-8" />
                    </div>

                    <div className="w-full">
                      <h4 className="text-center text-sm text-gray-400 mb-2">Semi Finals</h4>
                      <div className="space-y-24 pt-8">
                        <div className="border border-gaming-gray/30 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <div>Team Alpha</div>
                            <div className="font-bold">2</div>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <div>Team Delta</div>
                            <div>1</div>
                          </div>
                        </div>

                        <div className="border border-gaming-gray/30 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <div>Team Zeta</div>
                            <div>0</div>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <div>Team Theta</div>
                            <div className="font-bold">2</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center mx-4">
                      <div className="border-t-2 border-b-2 border-r-2 border-gaming-gray/30 h-32 w-8" />
                    </div>

                    <div className="w-full">
                      <h4 className="text-center text-sm text-gray-400 mb-2">Finals</h4>
                      <div className="pt-12">
                        <div className="border border-gaming-purple p-3 rounded-md bg-gaming-dark/60">
                          <div className="flex justify-between items-center">
                            <div className="font-medium">Team Alpha</div>
                            <div className="font-bold">3</div>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <div>Team Theta</div>
                            <div>1</div>
                          </div>
                          <div className="mt-2 flex justify-center text-gaming-purple">
                            <Trophy size={16} className="mr-1" />
                            <span className="text-sm font-medium">Champion</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="double-elimination">
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle>Double Elimination Bracket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16">
                <div className="text-gray-400 mb-4">Double elimination bracket view</div>
                <Button>Configure Bracket</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="round-robin">
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle>Round Robin Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16">
                <div className="text-gray-400 mb-4">Round robin group view</div>
                <Button>Configure Groups</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TournamentBrackets;
