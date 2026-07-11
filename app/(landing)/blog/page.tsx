import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { POSTS, formatPostDate } from "./posts";

export const metadata: Metadata = {
  title: "Blog — BizPilot",
  description: "Guias e boas práticas de atendimento com IA no WhatsApp: agentes, base de conhecimento, campanhas e agendamento automático.",
};

export default function Blog() {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-24 md:py-32">
      <div className="max-w-3xl mb-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Blog</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Guias práticos sobre atendimento com IA no WhatsApp — como funciona,
          como treinar seu agente e como tirar mais resultado de cada conversa.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col rounded-3xl border border-border bg-card p-8 hover:border-brand-500/50 transition-colors"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-brand-500 mb-3">{post.category}</span>
            <h2 className="text-xl font-bold mb-3 group-hover:text-brand-500 transition-colors">{post.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">{post.excerpt}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatPostDate(post.date)}</span>
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{post.readingMin} min</span>
              </span>
              <span className="flex items-center gap-1 font-medium text-brand-500">
                Ler <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
