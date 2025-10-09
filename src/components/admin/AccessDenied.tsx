
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AccessDeniedProps {
  message?: string;
}

const AccessDenied = ({ message = "You do not have permission to view this page." }: AccessDeniedProps) => {
  return (
    <main className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
      <Alert variant="destructive" className="w-full max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {message} Please contact an administrator if you believe this is an error.
        </AlertDescription>
      </Alert>
    </main>
  );
};

export default AccessDenied;
