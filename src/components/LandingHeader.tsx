import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const LandingHeader = () => {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SafeBatch Logo" className="h-10 w-10" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SafeBatch
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Button
              variant="ghost"
              onClick={() => scrollToSection("demo")}
              className="text-sm font-medium"
            >
              Demo
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection("services")}
              className="text-sm font-medium"
            >
              Features
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection("how-it-works")}
              className="text-sm font-medium"
            >
              How It Works
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection("about")}
              className="text-sm font-medium"
            >
              About
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection("contact")}
              className="text-sm font-medium"
            >
              Contact
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/faq")}
              className="text-sm font-medium"
            >
              FAQ
            </Button>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate("/auth")}
              className="hidden sm:inline-flex"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/waitlist")}
            >
              Join Waitlist
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
