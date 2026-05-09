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
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

function Dashboard() {
  const [scope, setScope] = useState("all");
  const [cutoff, setCutoff] = useState("20:00");
  const [search, setSearch] = useState("");

  const current = hourlyOccupancy[new Date().getHours()]?.inside ?? 0;
  const peak = Math.max(...hourlyOccupancy.map((d) => d.inside));
  const peakHour = hourlyOccupancy.find((d) => d.inside === peak)?.hour ?? "—";

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
          <div className="flex items-center gap-2">
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
            trend="+4.2% vs hier"
          />
          <KpiCard
            icon={<TrendingUp className="size-4" />}
            label="Pic d'occupation"
            value={peak.toLocaleString("fr-FR")}
            hint={`atteint à ${peakHour}`}
            trend="Aujourd'hui"
            tone="primary"
          />
          <KpiCard
            icon={<Clock className="size-4" />}
            label="Temps moyen / pers."
            value="8h 12m"
            hint="sur les 7 derniers jours"
            trend="−6m vs sem. dernière"
          />
          <KpiCard
            icon={<AlertTriangle className="size-4" />}
            label={`Dépassements ≥ ${cutoff}`}
            value={String(lateStayers.length)}
            hint="aujourd'hui"
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyOccupancy} margin={{ left: -12, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="occ" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="inside"
                    name="À l'intérieur"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#occ)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Temps moyen par zone</CardTitle>
              <CardDescription>Heures de présence quotidiennes</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgTimeByZone} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis
                    type="category"
                    dataKey="zone"
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-muted-foreground)"
                    width={88}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => `${v} h`}
                  />
                  <Bar dataKey="hours" fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        {/* Peak per day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pic d'occupation — 7 derniers jours</CardTitle>
            <CardDescription>Maximum simultané vs occupation moyenne</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakDays} margin={{ left: -12, right: 8 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="avg" name="Moyenne" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="peak" name="Pic" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
