import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search, FileText, Beaker, Building2, Mail, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="text-center max-w-2xl w-full">
        {/* Logo and 404 Header */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
            <img 
              src="/logo.png" 
              alt="SafeBatch" 
              className="relative h-24 w-24 drop-shadow-[0_0_20px_rgba(67,188,205,0.5)]"
            />
          </div>
        </div>
        
        <h1 className="mb-2 text-7xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="mb-4 text-3xl font-semibold text-foreground">Page Not Found</h2>
        <p className="mb-8 text-lg text-muted-foreground max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        
        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Button asChild variant="default" size="lg" className="text-base">
            <Link to="/">
              <Home className="mr-2 h-5 w-5" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base">
            <Link to="/dashboard">
              <Search className="mr-2 h-5 w-5" />
              Dashboard
            </Link>
          </Button>
        </div>

        {/* Quick Links */}
        <Card className="mb-6 bg-card/50 backdrop-blur-sm border-2">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Quick Links
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button asChild variant="ghost" size="sm" className="h-auto py-3 flex-col gap-2">
                <Link to="/quotes">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-xs">Quotes</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-auto py-3 flex-col gap-2">
                <Link to="/compounds">
                  <Beaker className="h-5 w-5 text-accent" />
                  <span className="text-xs">Compounds</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-auto py-3 flex-col gap-2">
                <Link to="/labs">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="text-xs">Labs</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-auto py-3 flex-col gap-2">
                <a href="mailto:support@safebatch.com">
                  <Mail className="h-5 w-5 text-accent" />
                  <span className="text-xs">Contact</span>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="bg-muted/30 backdrop-blur-sm rounded-lg p-6 mb-6 border">
          <div className="flex items-center justify-center gap-2 mb-3">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Need Help?</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            If you believe this is an error or need assistance, our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm">
            <a href="mailto:support@safebatch.com" className="text-primary hover:underline">
              📧 support@safebatch.com
            </a>
            <span className="hidden sm:inline text-muted-foreground">•</span>
            <a href="tel:+14155550123" className="text-primary hover:underline">
              📞 +1 (415) 555-0123
            </a>
          </div>
        </div>
        
        {/* Debug Info */}
        <div className="text-xs text-muted-foreground bg-muted/20 rounded px-3 py-2 inline-block">
          Requested path: <code className="text-primary font-mono">{location.pathname}</code>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
