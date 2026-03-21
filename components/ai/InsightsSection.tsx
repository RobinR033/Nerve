"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PatternInsight, PatternsResult } from "@/lib/ai/analyzePatterns";

const typeStyles: Record<PatternInsight["type"], { bg: string; dot: string; label: string }> = {
  strength: { bg: "bg-green-50 border-green-100",  dot: "bg-green-500", label: "Sterk punt" },
  warning:  { bg: "bg-yellow-50 border-yellow-100", dot: "bg-yellow-500", label: "Let op" },
  tip:      { bg: "bg-blue-50 border-blue-100",     dot: "bg-blue-500",   label: "Tip" },
};

export function InsightsSection() {
  const [result, setResult] = useState<PatternsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/patterns");
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setGenerated(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">◎</span>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest">Inzichten</h2>
        </div>
        <button
          onClick={generate}
          disabled={isLoading}
          className="text-xs font-medium text-orange hover:text-orange-dark transition-colors disabled:opacity-50"
        >
          {isLoading ? "Analyseren…" : generated ? "Opnieuw" : "Analyseer patronen"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!generated && !isLoading && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white border border-dashed border-gray-200 rounded-xl px-5 py-8 text-center"
          >
            <p className="text-sm text-gray-400 mb-3">
              Claude analyseert je takenpatronen en geeft persoonlijke productiviteitsinzichten.
            </p>
            <button
              onClick={generate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              <span>◎</span>
              Analyseer mijn patronen
            </button>
          </motion.div>
        )}

        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </motion.div>
        )}

        {generated && !isLoading && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {result.summary && (
              <p className="text-sm text-gray-500 italic">{result.summary}</p>
            )}
            {result.insights.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nog te weinig data voor inzichten.</p>
            ) : (
              result.insights.map((insight, i) => {
                const style = typeStyles[insight.type];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`flex gap-3 border rounded-xl px-4 py-3 ${style.bg}`}
                  >
                    <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${style.dot}`} />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{style.label}</p>
                      <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{insight.body}</p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
