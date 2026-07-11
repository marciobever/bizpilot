import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Calendar, Clock } from "lucide-react";
import { POSTS, getPost, formatPostDate } from "../posts";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Artigo não encontrado — BizPilot" };
  return {
    title: `${post.title} — BizPilot`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: "article" },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="w-full max-w-3xl mx-auto px-6 py-24 md:py-32">
      <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
        <ArrowLeft className="h-4 w-4" /> Todos os artigos
      </Link>

      <span className="block text-xs font-bold uppercase tracking-wider text-brand-500 mb-4">{post.category}</span>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">{post.title}</h1>
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-12 pb-8 border-b border-border">
        <span>Equipe BizPilot</span>
        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatPostDate(post.date)}</span>
        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{post.readingMin} min de leitura</span>
      </div>

      <div className="space-y-6">
        {post.content.map((block, i) => {
          if (block.type === "h2") {
            return <h2 key={i} className="text-2xl font-bold tracking-tight pt-4">{block.text}</h2>;
          }
          if (block.type === "ul") {
            return (
              <ul key={i} className="space-y-3 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3 text-muted-foreground leading-relaxed">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            );
          }
          return <p key={i} className="text-muted-foreground leading-relaxed text-lg">{block.text}</p>;
        })}
      </div>

      <div className="mt-16 rounded-3xl border border-brand-500/30 bg-brand-500/5 p-8 text-center">
        <h3 className="text-xl font-bold mb-2">Quer ver isso funcionando no seu WhatsApp?</h3>
        <p className="text-muted-foreground mb-6">Crie seu agente de IA e conecte seu número em minutos.</p>
        <Link
          href="/precos"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors"
        >
          Ver planos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
