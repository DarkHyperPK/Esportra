
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const SetPassword = () => {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        // Check if we have a session (established via the magic link hash)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                toast({
                    variant: "destructive",
                    title: "Invalid Link",
                    description: "This invite link is invalid or expired. Please ask for a new invitation.",
                });
                navigate("/auth/signin");
            }
        });
    }, [navigate, toast]);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast({
                title: "Password Set Successfully",
                description: "You are now logged in!",
            });

            navigate("/dashboard");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error setting password",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container flex items-center justify-center min-h-screen py-12">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Set Your Password</CardTitle>
                    <CardDescription>
                        Welcome! Please set a password to activate your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Set Password & Login
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default SetPassword;
