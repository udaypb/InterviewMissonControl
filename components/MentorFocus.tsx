import type { FocusCard } from "@/lib/datastore/types";

interface MentorFocusProps {
  cards: FocusCard[];
}

const variants = {
  purple: "border-[#8d7af0] bg-[#e7e3fb] text-[#4f46a3]",
  green: "border-[#61b88c] bg-[#dff1e8] text-[#2f7053]",
  yellow: "border-[#d9ab52] bg-[#faecd6] text-[#8b5f1d]"
} as const;

export function MentorFocus({ cards }: MentorFocusProps) {
  return (
    <section className="panel p-6 md:p-7">
      <h2 className="text-[1.75rem] font-semibold tracking-[-0.045em] md:text-[1.95rem]">
        Principal Mentor&apos;s Focus for Week 1
      </h2>
      <div className="mt-5 grid gap-4">
        {cards.map((card) => (
          <article key={card.title} className={`rounded-[18px] border-l-[5px] p-5 ${variants[card.variant]}`}>
            <p className="text-[1.02rem] leading-8">
              <span className="font-semibold">{card.title}:</span> {card.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
