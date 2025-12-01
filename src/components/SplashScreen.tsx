import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Start exit animation after 2 seconds
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2000);

    // Complete and unmount after exit animation
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-accent/20 transition-opacity duration-700 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Logo with multiple animated effects */}
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 animate-ping rounded-full bg-accent/30 blur-2xl" style={{ animationDuration: "2s" }} />
          
          {/* Rotating gradient ring */}
          <div className="absolute -inset-4 animate-spin rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-30 blur-xl" style={{ animationDuration: "3s" }} />
          
          {/* Pulsing inner glow */}
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/40 blur-xl" style={{ animationDuration: "1.5s" }} />
          
          {/* Logo with scale animation */}
          <img
            src="/logo.png"
            alt="SafeBatch"
            className="relative h-32 w-32 animate-[scale-in_0.6s_ease-out] drop-shadow-[0_0_20px_rgba(67,188,205,0.6)]"
          />
        </div>

        {/* App name with fade-in animation */}
        <div className="flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s", animationFillMode: "backwards" }}>
          <h1 className="text-3xl font-bold text-foreground">SafeBatch</h1>
          
          {/* Animated loading dots */}
          <div className="flex gap-1.5">
            <div 
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: "0s", animationDuration: "1s" }}
            />
            <div 
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: "0.15s", animationDuration: "1s" }}
            />
            <div 
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-accent"
              style={{ animationDelay: "0.3s", animationDuration: "1s" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
