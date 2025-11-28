import { Link, useLocation, useParams } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Breadcrumbs() {
  const location = useLocation();
  const params = useParams();
  const [compoundName, setCompoundName] = useState<string>("");

  useEffect(() => {
    if (params.id && location.pathname.includes("/compounds/")) {
      supabase
        .from("products")
        .select("name")
        .eq("id", params.id)
        .single()
        .then(({ data }) => {
          if (data) setCompoundName(data.name);
        });
    }
  }, [params.id, location.pathname]);

  const pathSegments = location.pathname.split("/").filter(Boolean);
  
  // Define route names
  const routeNames: Record<string, string> = {
    "": "Dashboard",
    "quotes": "Quotes",
    "compounds": "Compounds",
    "labs": "Labs",
    "bulk-import": "Bulk Import",
    "notifications": "Notifications",
    "settings": "Settings",
    "quote-confirm": "Quote Confirmation",
  };

  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
    
    // If it's a compound detail page, use the compound name
    if (segment === params.id && location.pathname.includes("/compounds/")) {
      return {
        label: compoundName || "Loading...",
        path,
        isLast: index === pathSegments.length - 1,
      };
    }
    
    return {
      label: routeNames[segment] || segment,
      path,
      isLast: index === pathSegments.length - 1,
    };
  });

  // Always start with Dashboard
  const allBreadcrumbs = [
    { label: "Dashboard", path: "/", isLast: pathSegments.length === 0 },
    ...breadcrumbs.filter((b) => b.label !== "Dashboard"),
  ];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {allBreadcrumbs.map((breadcrumb, index) => (
          <div key={breadcrumb.path} className="flex items-center gap-1.5">
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {breadcrumb.isLast ? (
                <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={breadcrumb.path}>{breadcrumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
