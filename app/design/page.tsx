"use client";

import { Button } from "@/components/ui/Button";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";

export default function DesignPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="max-w-3xl mx-auto space-y-14">

        {/* Header */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">Nerve</p>
          <h1 className="font-display text-5xl font-bold text-gray-900">Design systeem</h1>
        </div>

        {/* Kleuren */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-gray-900">Kleuren</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: "Orange", hex: "#FF4800", cls: "bg-orange" },
              { name: "Yellow", hex: "#FFD000", cls: "bg-yellow" },
              { name: "Blue",   hex: "#0057FF", cls: "bg-blue" },
              { name: "Urgent", hex: "#FF2020", cls: "bg-[#FF2020]" },
              { name: "Done",   hex: "#16A34A", cls: "bg-green-600" },
              { name: "Gray 900", hex: "#111111", cls: "bg-gray-900" },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
                <div className={`w-10 h-10 rounded-lg shrink-0 ${c.cls}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{c.hex}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typografie */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-gray-900">Typografie</h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <p className="font-display text-5xl font-bold text-gray-900">Display Bold 48</p>
            <p className="font-display text-3xl font-bold text-gray-900">Display Bold 30</p>
            <p className="font-display text-xl font-semibold text-gray-900">Display Semibold 20</p>
            <p className="text-base text-gray-700">Body Regular 16 — Inter voor leesbare tekst</p>
            <p className="text-sm text-gray-500">Body Small 14 — subtitels en labels</p>
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Label XS uppercase</p>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-gray-900">Buttons</h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
            {/* Varianten */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Varianten</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>
            {/* Groottes */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Groottes</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>
            {/* States */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">States</p>
              <div className="flex flex-wrap gap-3">
                <Button loading>Laden...</Button>
                <Button disabled>Uitgeschakeld</Button>
                <Button
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  Met icon
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-gray-900">Badges</h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Prioriteit</p>
              <div className="flex flex-wrap gap-2">
                <PriorityBadge priority="urgent" />
                <PriorityBadge priority="high" />
                <PriorityBadge priority="medium" />
                <PriorityBadge priority="low" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Status</p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="todo" />
                <StatusBadge status="in_progress" />
                <StatusBadge status="done" />
                <StatusBadge status="late" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Generiek</p>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="orange">Oranje</Badge>
                <Badge variant="blue">Blauw</Badge>
                <Badge variant="yellow">Geel</Badge>
                <Badge variant="green">Groen</Badge>
                <Badge variant="red">Rood</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Inputs */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-gray-900">Inputs</h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <Input label="Taaknaam" placeholder="Bijv. Offerte sturen naar klant" />
            <Input
              label="Met icon"
              placeholder="Zoeken..."
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            <Input label="Met fout" placeholder="..." error="Dit veld is verplicht" defaultValue="x" />
            <Input label="Met hint" placeholder="bijv. @thuis" hint="Gebruik @ voor context labels" />
            <Textarea label="Omschrijving" placeholder="Meer details over de taak..." rows={3} />
          </div>
        </section>

        {/* Taak card preview */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-gray-900">Taak card</h2>
          <div className="space-y-2">
            {[
              { title: "Offerte sturen naar Gemeente Amsterdam", priority: "urgent" as const, status: "todo" as const, project: "Sales", deadline: "Vandaag" },
              { title: "Weekplanning maken voor Q2", priority: "high" as const, status: "in_progress" as const, project: "Planning", deadline: "Morgen" },
              { title: "Design review Nerve dashboard", priority: "medium" as const, status: "todo" as const, project: "Nerve", deadline: "Vrijdag" },
              { title: "Factuur controleren", priority: "low" as const, status: "late" as const, project: "Financiën", deadline: "Gisteren" },
            ].map((task) => (
              <div
                key={task.title}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                {/* Vinkje */}
                <button className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-orange shrink-0 transition-colors" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{task.project}</span>
                    <span className="text-gray-200">·</span>
                    <span className={`text-xs font-medium ${task.status === "late" ? "text-[#CC0000]" : "text-gray-400"}`}>
                      {task.deadline}
                    </span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
