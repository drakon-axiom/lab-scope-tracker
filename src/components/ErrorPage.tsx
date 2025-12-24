import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  ArrowLeft, 
  MessageCircle,
  ServerCrash
} from "lucide-react";

interface ErrorPageProps {
  code?: number;
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showRefreshButton?: boolean;
  showContactButton?: boolean;
  onRetry?: () => void;
}

export function ErrorPage({
  code = 500,
  title = "Something went wrong",
  message = "We're experiencing technical difficulties. Our team has been notified and is working to fix the issue.",
  showHomeButton = true,
  showBackButton = true,
  showRefreshButton = true,
  showContactButton = true,
  onRetry,
}: ErrorPageProps) {
  const navigate = useNavigate();

  const handleRefresh = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Error Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-destructive/20 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-destructive/10 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ServerCrash className="h-12 w-12 text-destructive" />
          </div>
        </div>

        {/* Error Code */}
        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-foreground/10">{code}</h1>
          <h2 className="text-2xl font-semibold text-foreground -mt-4">{title}</h2>
        </div>

        {/* Error Message */}
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          {message}
        </p>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          Working on a fix
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          {showRefreshButton && (
            <Button onClick={handleRefresh} className="gap-2 min-w-[140px]">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          
          {showHomeButton && (
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2 min-w-[140px]">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          )}
          
          {showBackButton && (
            <Button variant="ghost" onClick={handleGoBack} className="gap-2 min-w-[140px]">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          )}
        </div>

        {/* Help Section */}
        {showContactButton && (
          <div className="pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-4">
              If this problem persists, please contact support
            </p>
            <Button 
              variant="link" 
              className="gap-2 text-primary"
              onClick={() => window.location.href = "mailto:support@example.com"}
            >
              <MessageCircle className="h-4 w-4" />
              Contact Support
            </Button>
          </div>
        )}

        {/* Technical Details (collapsible) */}
        <details className="text-left pt-4">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            Technical Details
          </summary>
          <div className="mt-3 p-4 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
            <div>Error Code: {code}</div>
            <div>Timestamp: {new Date().toISOString()}</div>
            <div>Path: {window.location.pathname}</div>
            <div>User Agent: {navigator.userAgent.slice(0, 50)}...</div>
          </div>
        </details>
      </div>
    </div>
  );
}

// Pre-configured variants
export function Error404() {
  const location = typeof window !== 'undefined' ? window.location : { pathname: '/' };
  
  return (
    <ErrorPage
      code={404}
      title="Page Not Found"
      message={`The page "${location.pathname}" doesn't exist or has been moved. Let's get you back on track.`}
      showBackButton={true}
      showContactButton={true}
    />
  );
}

export function Error500() {
  return (
    <ErrorPage
      code={500}
      title="Internal Server Error"
      message="We're experiencing technical difficulties. Our team has been notified and is working to fix the issue."
    />
  );
}

export function Error503() {
  return (
    <ErrorPage
      code={503}
      title="Service Unavailable"
      message="The service is temporarily unavailable. Please try again in a few minutes."
    />
  );
}

export function ErrorNetwork() {
  return (
    <ErrorPage
      code={0}
      title="Network Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      showContactButton={false}
    />
  );
}
