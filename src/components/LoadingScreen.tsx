const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="flex flex-col items-center gap-8">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/30 blur-2xl" />
          <div className="absolute inset-0 animate-ping rounded-full bg-accent/20 blur-xl" />
          <img 
            src="/logo.png" 
            alt="SafeBatch" 
            className="relative h-24 w-24 animate-[scale-in_0.5s_ease-out] drop-shadow-[0_0_15px_rgba(67,188,205,0.5)]"
          />
        </div>
        
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">SafeBatch</h1>
          <div className="flex gap-1.5">
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
