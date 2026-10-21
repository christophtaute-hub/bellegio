import type { ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { hilfeBild, hilfeLink, ueberschriftAnker } from "@/lib/hilfe/links";

function textVon(kinder: ReactNode): string {
  if (typeof kinder === "string" || typeof kinder === "number") return String(kinder);
  if (Array.isArray(kinder)) return kinder.map(textVon).join("");
  if (kinder && typeof kinder === "object" && "props" in kinder) return textVon((kinder as { props: { children?: ReactNode } }).props.children);
  return "";
}

/** Zeigt ein Markdown-Kapitel im Stil der App. Kein Roh-HTML; Links und Bilder werden auf App-Adressen umgeschrieben. */
export function HilfeMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3 text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="font-heading text-3xl tracking-tight text-primary">{children}</h1>,
          h2: ({ children }) => (
            <h2 id={ueberschriftAnker(textVon(children))} className="mt-4 scroll-mt-20 font-heading text-xl text-primary">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 id={ueberschriftAnker(textVon(children))} className="mt-2 scroll-mt-20 font-heading text-base text-primary">
              {children}
            </h3>
          ),
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="flex list-disc flex-col gap-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="flex list-decimal flex-col gap-1 pl-5">{children}</ol>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 text-muted-foreground">{children}</blockquote>,
          code: ({ children }) => <code className="rounded bg-secondary px-1 py-0.5 font-mono text-xs">{children}</code>,
          a: ({ href, children }) => {
            const link = hilfeLink(href);
            return link.extern ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
                {children}
              </a>
            ) : (
              <Link href={link.href} className="text-primary underline-offset-2 hover:underline">
                {children}
              </Link>
            );
          },
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element -- statische, schon skalierte Screenshots aus public/hilfe
            <img src={hilfeBild(typeof src === "string" ? src : undefined)} alt={alt ?? ""} loading="lazy" className="w-full rounded-xl border" />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-secondary/60">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 font-medium">{children}</th>,
          td: ({ children }) => <td className="border-t px-3 py-2 align-top">{children}</td>,
          hr: () => <hr className="my-2" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
