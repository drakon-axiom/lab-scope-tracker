import { ReactNode } from "react";
import PullToRefresh from "react-pull-to-refresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { RefreshCw } from "lucide-react";

interface PullToRefreshWrapperProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}

export function PullToRefreshWrapper({ children, onRefresh }: PullToRefreshWrapperProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <PullToRefresh
      onRefresh={onRefresh}
      icon={
        <div className="flex items-center justify-center w-full py-4">
          <RefreshCw className="h-6 w-6 text-primary animate-spin" />
        </div>
      }
      loading={
        <div className="flex items-center justify-center w-full py-4">
          <RefreshCw className="h-6 w-6 text-primary animate-spin" />
        </div>
      }
      resistance={3}
    >
      <div>{children}</div>
    </PullToRefresh>
  );
}
