import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const sections = [
  { id: "services", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export const SectionNav = () => {
  const [activeSection, setActiveSection] = useState("");

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

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
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
                  "h-2 rounded-full bg-primary transition-all duration-200",
                  activeSection === id ? "w-8" : "w-2"
                )}
              />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
