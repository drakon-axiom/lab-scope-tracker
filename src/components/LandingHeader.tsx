import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const LandingHeader = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80; // Account for sticky header height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
    setMobileMenuOpen(false); // Close mobile menu after navigation
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

          {/* Navigation Links - Only show on large desktop */}
          <nav className="hidden lg:flex items-center gap-6">
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
              onClick={() => scrollToSection("faq")}
              className="text-sm font-medium"
            >
              FAQ
            </Button>
          </nav>

          {/* Mobile & Tablet Menu */}
          <div className="flex lg:hidden items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4 mt-8">
                  <Button
                    variant="ghost"
                    onClick={() => scrollToSection("demo")}
                    className="justify-start text-base"
                  >
                    Demo
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => scrollToSection("services")}
                    className="justify-start text-base"
                  >
                    Features
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => scrollToSection("how-it-works")}
                    className="justify-start text-base"
                  >
                    How It Works
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => scrollToSection("about")}
                    className="justify-start text-base"
                  >
                    About
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => scrollToSection("contact")}
                    className="justify-start text-base"
                  >
                    Contact
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => scrollToSection("faq")}
                    className="justify-start text-base"
                  >
                    FAQ
                  </Button>
                  <div className="border-t pt-4 mt-4 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigate("/auth");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={() => {
                        navigate("/waitlist");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      Join Waitlist
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center gap-2">
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
