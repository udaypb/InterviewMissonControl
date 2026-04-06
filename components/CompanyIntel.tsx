"use client";

import { useState } from "react";

import type { CompanyIntelCard } from "@/lib/datastore/types";

interface CompanyIntelProps {
  companies: CompanyIntelCard[];
}

export function CompanyIntel({ companies }: CompanyIntelProps) {
  const [activeCompany, setActiveCompany] = useState(companies[0]?.company ?? "");
  const active = companies.find((company) => company.company === activeCompany) ?? companies[0];

  if (!active) {
    return (
      <section className="panel p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Company Intel</p>
        <div className="mt-5 rounded-3xl border border-dashed border-border bg-black/10 p-5">
          <p className="text-sm text-text">No company data yet.</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Add rows in `companies` and `recruiter_notes` to unlock sponsorship, recruiter, and angle views.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel p-6 md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Company Intel</p>
          <h2 className="mt-2 text-[1.85rem] font-semibold tracking-[-0.045em]">Pipeline context and angles</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {companies.map((company) => (
            <button
              key={company.company}
              type="button"
              onClick={() => setActiveCompany(company.company)}
              className={`rounded-[16px] border px-4 py-2 text-sm font-medium transition ${
                company.company === active.company
                  ? "border-[#575757] bg-[#2d2d2d] text-text"
                  : "border-border/80 bg-black/10 text-muted hover:border-[#4c4c4c] hover:text-text"
              }`}
            >
              {company.company}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <article className="soft-panel p-5 md:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Sponsorship</p>
              <p className="mt-2 text-sm leading-6 text-text">{active.sponsorship}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Compensation</p>
              <p className="mt-2 text-sm leading-6 text-text">{active.compensation}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Target Level</p>
              <p className="mt-2 text-sm leading-6 text-text">{active.targetLevel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Status</p>
              <p className="mt-2 text-sm leading-6 text-text">{active.status}</p>
            </div>
          </div>
          <div className="mt-7 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Interview Process</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                {active.interviewProcess.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-[0.55rem] h-1.5 w-1.5 rounded-full bg-[#d3b58b]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Focus Areas</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                {active.focusAreas.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-[0.55rem] h-1.5 w-1.5 rounded-full bg-[#d3b58b]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
        <article className="soft-panel p-5 md:p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Tip</p>
            <p className="mt-3 text-sm leading-7 text-muted">{active.tip}</p>
          </div>
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Your Angle</p>
            <p className="mt-3 text-sm leading-7 text-muted">{active.yourAngle}</p>
          </div>
          <div className="mt-6 grid gap-5 border-t border-border/70 pt-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Recruiter</p>
              <p className="mt-2 text-sm leading-6 text-text">{active.recruiter}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Next Step</p>
              <p className="mt-2 text-sm leading-6 text-text">{active.nextStep}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
