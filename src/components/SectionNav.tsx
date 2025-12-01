import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { id: "services", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export const SectionNav = () => {
  const [activeSection, setActiveSection] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [clickedSection, setClickedSection] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-50% 0px -50% 0px" }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      
      // Calculate scroll progress
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollPercentage = (scrollTop / (documentHeight - windowHeight)) * 100;
      setScrollProgress(Math.min(scrollPercentage, 100));
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToSection = (id: string) => {
    setClickedSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => setClickedSection(null), 600);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div 
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Desktop Navigation - Right Side */}
      <nav className="hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 z-50">
        <ul className="space-y-4">
          {sections.map(({ id, label }) => (
            <li key={id}>
              <button
                onClick={() => scrollToSection(id)}
                className={cn(
                  "group flex items-center gap-3 transition-all duration-200",
                  activeSection === id ? "opacity-100" : "opacity-40 hover:opacity-70"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium transition-all duration-200 text-foreground",
                    activeSection === id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  {label}
                </span>
                <div
                  className={cn(
                    "h-2 rounded-full bg-primary transition-all duration-300",
                    activeSection === id ? "w-8" : "w-2",
                    clickedSection === id && "scale-125 animate-pulse"
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile Navigation - Bottom */}
      <nav className="lg:hidden fixed bottom-20 left-0 right-0 z-50 px-4">
        <div className="bg-card/95 backdrop-blur-sm border rounded-full shadow-lg px-6 py-3 mx-auto max-w-fit">
          <ul className="flex items-center gap-3">
            {sections.map(({ id }) => (
              <li key={id}>
                <button
                  onClick={() => scrollToSection(id)}
                  className={cn(
                    "transition-all duration-300",
                    activeSection === id ? "opacity-100" : "opacity-40"
                  )}
                >
                  <div
                    className={cn(
                      "h-2 rounded-full bg-primary transition-all duration-300",
                      activeSection === id ? "w-8" : "w-2",
                      clickedSection === id && "scale-125 animate-pulse"
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Back to Top Button */}
      <Button
        onClick={scrollToTop}
        size="icon"
        className={cn(
          "fixed right-4 lg:right-8 bottom-4 lg:bottom-8 z-50 rounded-full shadow-lg transition-all duration-300",
          showBackToTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16 pointer-events-none"
        )}
      >
        <ChevronUp className="h-5 w-5" />
      </Button>
    </>
  );
};
