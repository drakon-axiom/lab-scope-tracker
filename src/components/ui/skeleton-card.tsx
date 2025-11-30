import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SkeletonCardProps {
  hasHeader?: boolean;
  lines?: number;
}

export const SkeletonCard = ({ hasHeader = true, lines = 3 }: SkeletonCardProps) => {
  return (
    <Card>
      {hasHeader && (
        <CardHeader>
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
      )}
      <CardContent className={hasHeader ? "" : "pt-6"}>
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" style={{ width: `${100 - i * 10}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
