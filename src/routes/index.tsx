import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  Building2,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  DoorOpen,
  Search,
} from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import { chartBaseOptions } from "@/lib/chart-setup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Supervision — Occupation & Présence" },
      {
        name: "description",
        content:
          "Tableau de bord d'occupation et présence : flux temps réel, pic, temps moyen et dépassements horaires.",
      },
    ],
  }),
  component: Dashboard,
});

// --- Mock data ---
const SCOPES = [
  { id: "all", label: "Tous les sites" },
  { id: "site-paris", label: "Site — Paris HQ" },
  { id: "site-lyon", label: "Site — Lyon" },
  { id: "zone-rd", label: "Zone — R&D" },
  { id: "sector-prod", label: "Secteur — Production" },
  { id: "unit-lab", label: "Unité — Laboratoire" },
];

const hourlyOccupancy = Array.from({ length: 24 }, (_, h) => {
  const base =
    h < 7
      ? 4
      : h < 9
        ? 80 + h * 40
        : h < 12
          ? 420 + (h - 9) * 30
          : h < 14
            ? 380 - (h - 12) * 40
            : h < 18
              ? 470 - (h - 14) * 25
              : h < 21
                ? 200 - (h - 18) * 50
                : 12;
  return {
    hour: `${String(h).padStart(2, "0")}h`,
    inside: Math.max(0, Math.round(base + (Math.sin(h) * 18))),
  };
});

const peakDays = [
  { day: "Lun", peak: 512, avg: 380 },
  { day: "Mar", peak: 538, avg: 402 },
  { day: "Mer", peak: 491, avg: 365 },
  { day: "Jeu", peak: 564, avg: 420 },
  { day: "Ven", peak: 478, avg: 351 },
  { day: "Sam", peak: 92, avg: 41 },
  { day: "Dim", peak: 24, avg: 9 },
];

const presentNow = [
  { id: "REG-1042", first: "Camille", last: "Bernard", entry: "08:12", ap: "AP-Hall-Nord", zone: "R&D" },
  { id: "REG-1098", first: "Yanis", last: "Moreau", entry: "08:24", ap: "AP-Parking-B", zone: "Production" },
  { id: "REG-1124", first: "Sophie", last: "Lefèvre", entry: "08:31", ap: "AP-Hall-Nord", zone: "R&D" },
  { id: "REG-1187", first: "Thomas", last: "Durand", entry: "08:47", ap: "AP-Quai-3", zone: "Logistique" },
  { id: "REG-1203", first: "Inès", last: "Garcia", entry: "09:02", ap: "AP-Hall-Sud", zone: "Direction" },
  { id: "REG-1255", first: "Lucas", last: "Petit", entry: "09:18", ap: "AP-Hall-Nord", zone: "R&D" },
  { id: "REG-1281", first: "Léa", last: "Martin", entry: "09:34", ap: "AP-Parking-B", zone: "Production" },
  { id: "REG-1310", first: "Karim", last: "Benali", entry: "09:51", ap: "AP-Hall-Sud", zone: "Direction" },
];

const lateStayers = [
  { id: "REG-0844", name: "Antoine Roche", entry: "08:05", exit: "20:42", ap: "AP-Hall-Nord", status: "Sorti" },
  { id: "REG-1124", name: "Sophie Lefèvre", entry: "08:31", exit: null, ap: "AP-Hall-Nord", status: "Encore présent" },
  { id: "REG-0921", name: "Marc Dubois", entry: "07:48", exit: "21:15", ap: "AP-Quai-3", status: "Sorti" },
  { id: "REG-1255", name: "Lucas Petit", entry: "09:18", exit: null, ap: "AP-Hall-Nord", status: "Encore présent" },
  { id: "REG-0712", name: "Hélène Faure", entry: "08:12", exit: "20:08", ap: "AP-Hall-Sud", status: "Sorti" },
];

const avgTimeByZone = [
  { zone: "R&D", hours: 8.6 },
  { zone: "Production", hours: 9.1 },
  { zone: "Direction", hours: 7.4 },
  { zone: "Logistique", hours: 8.9 },
  { zone: "Laboratoire", hours: 7.8 },
  { zone: "Accueil", hours: 6.9 },
];

type Period = "today" | "week" | "month";
const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
};

function Dashboard() {
  const [scope, setScope] = useState("all");
  const [period, setPeriod] = useState<Period>("today");
  const [cutoff, setCutoff] = useState("20:00");
  const [search, setSearch] = useState("");

  const current = hourlyOccupancy[new Date().getHours()]?.inside ?? 0;
  const dayPeak = Math.max(...hourlyOccupancy.map((d) => d.inside));
  const peakHour = hourlyOccupancy.find((d) => d.inside === dayPeak)?.hour ?? "—";

  const periodKpis = useMemo(() => {
    if (period === "today") {
      return {
        peak: dayPeak,
        peakHint: `atteint à ${peakHour}`,
        peakTrend: "Aujourd'hui",
        avgTime: "8h 12m",
        avgHint: "sur la journée",
        avgTrend: "−6m vs hier",
        late: lateStayers.length,
        lateHint: "aujourd'hui",
        presenceTrend: "+4.2% vs hier",
      };
    }
    if (period === "week") {
      return {
        peak: Math.max(...peakDays.map((d) => d.peak)),
        peakHint: "max sur 7 jours",
        peakTrend: "Cette semaine",
        avgTime: "8h 04m",
        avgHint: "sur les 7 derniers jours",
        avgTrend: "−12m vs sem. dernière",
        late: 23,
        lateHint: "cette semaine",
        presenceTrend: "+2.8% vs sem. dernière",
      };
    }
    return {
      peak: 612,
      peakHint: "max sur 30 jours",
      peakTrend: "Ce mois",
      avgTime: "7h 58m",
      avgHint: "sur les 30 derniers jours",
      avgTrend: "−18m vs mois dernier",
      late: 94,
      lateHint: "ce mois",
      presenceTrend: "+5.1% vs mois dernier",
    };
  }, [period, dayPeak, peakHour]);

  const filteredPresent = useMemo(
    () =>
      presentNow.filter((p) =>
        `${p.first} ${p.last} ${p.id} ${p.zone}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 grid place-items-center">
              <Activity className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Supervision · Présence</h1>
              <p className="text-xs text-muted-foreground">
                Métriques d'occupation en temps réel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-md border bg-card p-0.5">
              {(["today", "week", "month"] as Period[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={period === p ? "default" : "ghost"}
                  className="h-8 px-3 text-xs"
                  onClick={() => setPeriod(p)}
                >
                  {PERIOD_LABELS[p]}
                </Button>
              ))}
            </div>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-[220px]">
                <Building2 className="size-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="gap-1.5 py-1.5">
              <span className="size-2 rounded-full bg-success animate-pulse" />
              Live
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<Users className="size-4" />}
            label="Présence courante"
            value={current.toLocaleString("fr-FR")}
            hint="personnes à l'intérieur"
            trend={periodKpis.presenceTrend}
          />
          <KpiCard
            icon={<TrendingUp className="size-4" />}
            label="Pic d'occupation"
            value={periodKpis.peak.toLocaleString("fr-FR")}
            hint={periodKpis.peakHint}
            trend={periodKpis.peakTrend}
            tone="primary"
          />
          <KpiCard
            icon={<Clock className="size-4" />}
            label="Temps moyen / pers."
            value={periodKpis.avgTime}
            hint={periodKpis.avgHint}
            trend={periodKpis.avgTrend}
          />
          <KpiCard
            icon={<AlertTriangle className="size-4" />}
            label={`Dépassements ≥ ${cutoff}`}
            value={String(periodKpis.late)}
            hint={periodKpis.lateHint}
            trend={`${lateStayers.filter((l) => !l.exit).length} encore présents`}
            tone="warning"
          />
        </section>

        {/* Charts row */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Occupation au cours de la journée</CardTitle>
              <CardDescription>
                Nombre de personnes à l'intérieur, par tranche horaire
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <Line
                options={chartBaseOptions}
                data={{
                  labels: hourlyOccupancy.map((d) => d.hour),
                  datasets: [
                    {
                      label:
                        period === "today"
                          ? "À l'intérieur"
                          : period === "week"
                            ? "Moyenne semaine"
                            : "Moyenne mois",
                      data: hourlyOccupancy.map((d) =>
                        Math.round(d.inside * (period === "today" ? 1 : period === "week" ? 0.92 : 0.85)),
                      ),
                      borderColor: "oklch(0.55 0.18 255)",
                      backgroundColor: "oklch(0.55 0.18 255 / 0.18)",
                      borderWidth: 2,
                      tension: 0.35,
                      fill: true,
                      pointRadius: 0,
                      pointHoverRadius: 4,
                    },
                  ],
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Temps moyen par zone</CardTitle>
              <CardDescription>
                {period === "today"
                  ? "Heures de présence aujourd'hui"
                  : period === "week"
                    ? "Heures de présence sur 7 jours"
                    : "Heures de présence sur 30 jours"}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <Bar
                options={{
                  ...chartBaseOptions,
                  indexAxis: "y" as const,
                  plugins: { ...chartBaseOptions.plugins, legend: { display: false } },
                }}
                data={{
                  labels: avgTimeByZone.map((d) => d.zone),
                  datasets: [
                    {
                      label: "Heures",
                      data: avgTimeByZone.map((d) =>
                        Number(
                          (d.hours * (period === "today" ? 1 : period === "week" ? 0.96 : 0.92)).toFixed(1),
                        ),
                      ),
                      backgroundColor: "oklch(0.65 0.15 155)",
                      borderRadius: 6,
                    },
                  ],
                }}
              />
            </CardContent>
          </Card>
        </section>

        {/* Peak per day */}
        {(() => {
          const monthDays = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            const peak = 380 + Math.round(Math.sin(i / 2) * 90 + (i % 7 === 5 || i % 7 === 6 ? -300 : 0));
            return {
              day: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
              peak: Math.max(20, peak),
              avg: Math.max(10, Math.round(peak * 0.74)),
            };
          });
          const series =
            period === "today"
              ? [{ day: "Aujourd'hui", peak: dayPeak, avg: Math.round(dayPeak * 0.74) }]
              : period === "week"
                ? peakDays
                : monthDays;
          const titleSuffix =
            period === "today" ? "aujourd'hui" : period === "week" ? "7 derniers jours" : "30 derniers jours";
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pic d'occupation — {titleSuffix}</CardTitle>
                <CardDescription>Maximum simultané vs occupation moyenne</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                <Bar
                  options={chartBaseOptions}
                  data={{
                    labels: series.map((d) => d.day),
                    datasets: [
                      {
                        label: "Moyenne",
                        data: series.map((d) => d.avg),
                        backgroundColor: "oklch(0.65 0.22 35)",
                        borderRadius: 4,
                      },
                      {
                        label: "Pic",
                        data: series.map((d) => d.peak),
                        backgroundColor: "oklch(0.55 0.18 255)",
                        borderRadius: 4,
                      },
                    ],
                  }}
                />
              </CardContent>
            </Card>
          );
        })()}

        {/* Tabs: present / late */}
        <Tabs defaultValue="present" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="present" className="gap-2">
                <DoorOpen className="size-4" /> Présents ({presentNow.length})
              </TabsTrigger>
              <TabsTrigger value="late" className="gap-2">
                <AlertTriangle className="size-4" /> Dépassements ({lateStayers.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="present">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-base">Liste des présents</CardTitle>
                  <CardDescription>
                    Identité, point d'accès d'entrée et heure
                  </CardDescription>
                </div>
                <div className="relative w-full max-w-xs">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registration</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Point d'accès</TableHead>
                      <TableHead className="text-right">Entrée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPresent.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {p.first} {p.last}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{p.zone}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.ap}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.entry}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="late">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-base">Personnes ayant dépassé l'heure limite</CardTitle>
                  <CardDescription>
                    Présentes dans le bâtiment à un moment ≥ {cutoff} aujourd'hui
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Cutoff</span>
                  <Input
                    type="time"
                    value={cutoff}
                    onChange={(e) => setCutoff(e.target.value)}
                    className="w-[120px]"
                  />
                  <Button variant="outline" size="sm">Exporter</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registration</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Dernière entrée</TableHead>
                      <TableHead>Dernière sortie</TableHead>
                      <TableHead>AP</TableHead>
                      <TableHead className="text-right">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lateStayers.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.id}
                        </TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="tabular-nums">{p.entry}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {p.exit ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.ap}</TableCell>
                        <TableCell className="text-right">
                          {p.exit ? (
                            <Badge variant="outline">Sorti</Badge>
                          ) : (
                            <Badge className="bg-warning text-warning-foreground hover:bg-warning">
                              Encore présent
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <footer className="text-center text-xs text-muted-foreground pt-4">
          Données issues de <code className="font-mono">/v1/supervision/occupancy/*</code> · Feature 3
        </footer>
      </main>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  trend,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  trend: string;
  tone?: "default" | "primary" | "warning";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "warning"
        ? "bg-warning/15 text-warning-foreground"
        : "bg-muted text-foreground";
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={`size-8 rounded-lg grid place-items-center ${toneClass}`}>
            {icon}
          </span>
        </div>
        <div>
          <div className="text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        </div>
        <div className="text-xs font-medium text-muted-foreground">{trend}</div>
      </CardContent>
    </Card>
  );
}
