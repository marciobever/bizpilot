import type { MetadataRoute } from "next";

const SITE_URL = "https://www.bizpilot.com.br";

const ROUTES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/funcionalidades", priority: 0.9, changeFrequency: "monthly" },
  { path: "/precos", priority: 0.9, changeFrequency: "monthly" },
  { path: "/setores", priority: 0.8, changeFrequency: "monthly" },
  { path: "/integracoes", priority: 0.7, changeFrequency: "monthly" },
  { path: "/cases", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/api-docs", priority: 0.5, changeFrequency: "monthly" },
  { path: "/ajuda", priority: 0.5, changeFrequency: "monthly" },
  { path: "/sobre", priority: 0.5, changeFrequency: "yearly" },
  { path: "/contato", priority: 0.5, changeFrequency: "yearly" },
  { path: "/termos", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacidade", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
