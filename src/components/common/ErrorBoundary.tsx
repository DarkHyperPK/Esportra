import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error in ${this.props.name || 'component'}:`, error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-4 border border-red-500/20 bg-red-500/10 rounded-lg flex flex-col items-center justify-center gap-2 min-h-[200px]">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <h3 className="font-semibold text-red-500">Something went wrong</h3>
                    <p className="text-sm text-gray-400 text-center max-w-md">
                        {this.props.name ? `Error in ${this.props.name}: ` : ''}
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <Button variant="outline" size="sm" onClick={this.handleRetry} className="mt-2">
                        Try Again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
