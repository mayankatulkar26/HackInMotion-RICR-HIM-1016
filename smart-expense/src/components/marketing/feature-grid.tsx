'use client';

import { motion } from 'framer-motion';
import {
  BrainCircuit,
  FileSpreadsheet,
  LineChart,
  Target,
  MessageCircle,
  Zap,
} from 'lucide-react';

const FEATURES = [
  {
    icon: FileSpreadsheet,
    title: 'CSV import that just works',
    body: 'Bank statements in weird formats? We handle DD/MM/YYYY, MM-DD, ISO, negative amounts, missing fields — with a preview before anything hits your data.',
  },
  {
    icon: BrainCircuit,
    title: 'Hybrid categorization',
    body: '60+ rules cover 80% of Indian merchants instantly. Gemini handles the rest. Merchant results are cached so the same shop never costs a second API call.',
  },
  {
    icon: LineChart,
    title: 'Actual insights',
    body: 'Top categories, month-over-month spikes, recurring payment detection — computed from your real data, not a demo dataset.',
  },
  {
    icon: Target,
    title: 'Budgets & goals',
    body: 'Set monthly limits per category. Watch progress bars go green → yellow → red. Track savings goals with a live percentage.',
  },
  {
    icon: MessageCircle,
    title: 'Ask your money anything',
    body: '"How much did I spend on food last month?" gets a real answer grounded in your data, not a generic reply.',
  },
  {
    icon: Zap,
    title: 'Fast where it matters',
    body: 'Server actions, no API boilerplate. Rule-based categorization runs client-fast; AI only fires when it earns its keep.',
  },
];

export function FeatureGrid() {
  return (
    <div>
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        Your Money Deserves a Smarter Tracker.
      </motion.h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Every feature is powered by real data, real logic, and real APIs. Nothing is
        faked for the screenshot.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="card-elev p-6 group hover:border-accent/50 hover:shadow-soft-lg transition-all"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent group-hover:scale-110 transition-transform">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {f.body}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
