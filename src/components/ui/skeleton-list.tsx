import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonListProps {
  items?: number;
  hasAvatar?: boolean;
}

export const SkeletonList = ({ items = 5, hasAvatar = false }: SkeletonListProps) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          {hasAvatar && <Skeleton className="h-12 w-12 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};
