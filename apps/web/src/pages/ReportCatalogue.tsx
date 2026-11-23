import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportsDrawer } from "@/components/reports/ExportsDrawer";
import { callApi } from "@/api/callApi";
import type { ReportMetadataDto } from "@hm/shared";
import {
  FileText,
  Search,
  ArrowRight,
  Layers,
  Shield,
  Laptop,
  Clock,
  History,
  CheckCircle2,
  HardDriveDownload,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  hardware: <Laptop className="h-5 w-5 text-blue-500" />,
  inventory: <Layers className="h-5 w-5 text-indigo-500" />,
  software: <FileText className="h-5 w-5 text-emerald-500" />,
  lifecycle: <Clock className="h-5 w-5 text-amber-500" />,
  "service-level": <CheckCircle2 className="h-5 w-5 text-cyan-500" />,
  security: <Shield className="h-5 w-5 text-red-500" />,
  audit: <History className="h-5 w-5 text-purple-500" />,
};

export function ReportCatalogue() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [exportsDrawerOpen, setExportsDrawerOpen] = useState(false);

  const {
    data: reports = [],
    isLoading,
    error,
  } = useQuery<ReportMetadataDto[]>({
    queryKey: ["reports-list"],
    queryFn: async () => {
      const res = await callApi<ReportMetadataDto[]>({
        url: "reports/list",
        method: "POST",
        body: {},
      });
      if (!res.ok || !res.data) throw new Error(res.message);
      return res.data;
    },
  });

  const categories = [
    "all",
    ...Array.from(new Set(reports.map((r) => r.category))).filter(Boolean),
  ];

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.key.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics Catalogue"
        description="Comprehensive operational reports, asset lifecycle audits, compliance data, and streaming export center."
        action={
          <Button
            variant="outline"
            onClick={() => setExportsDrawerOpen(true)}
            className="flex items-center gap-2"
          >
            <HardDriveDownload className="h-4 w-4" />
            <span>Export Tasks</span>
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports by name, key, or metric..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-base sm:text-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "primary" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="min-h-[36px] min-w-[36px] px-3 text-xs capitalize whitespace-nowrap"
            >
              {cat.replace("-", " ")}
            </Button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 space-y-4 animate-pulse">
              <div className="h-6 w-2/3 bg-muted rounded" />
              <div className="h-12 w-full bg-muted/60 rounded" />
              <div className="h-4 w-1/3 bg-muted rounded" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-12 text-center text-destructive">
          <p className="font-semibold text-base">
            Failed to load reports catalogue
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please verify network connectivity and role permissions.
          </p>
        </Card>
      ) : filteredReports.length === 0 ? (
        <Card className="p-16 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No matching reports found</p>
          <p className="text-xs mt-1">
            Try clearing your search query or selecting another category.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReports.map((report) => (
            <Card
              key={report.key}
              className="p-6 flex flex-col justify-between hover:border-primary/50 hover:shadow-sm transition-all duration-200 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg p-2.5 bg-accent/60 group-hover:bg-primary/10 transition-colors">
                    {CATEGORY_ICONS[report.category] || (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {report.category}
                  </span>
                </div>

                <div>
                  <h2 className="font-semibold text-base tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {report.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{report.columns?.length || 0} cols</span>
                  <span>•</span>
                  <span>{report.filters?.length || 0} filters</span>
                </div>

                <Button
                  size="sm"
                  onClick={() => navigate(`/reports/${report.key}`)}
                  className="h-8 px-3 text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                >
                  <span>Open</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Background Exports Drawer */}
      <ExportsDrawer
        open={exportsDrawerOpen}
        onOpenChange={setExportsDrawerOpen}
      />
    </div>
  );
}
export default ReportCatalogue;
