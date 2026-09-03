import { useEffect, useState } from "react";
import { LifeBuoy, PlayCircle } from "lucide-react";
import { apiClient } from "@/services/api";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

type Media = { type: "image" | "video"; url: string; caption?: string };
type Article = { id: string; title: string; body?: string; media?: Media[]; updated_at?: string; created_by_name?: string };

// Turn a YouTube/Vimeo watch URL into an embeddable one; otherwise return null (use a <video> tag).
function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

function MediaBlock({ m }: { m: Media }) {
  if (m.type === "video") {
    const embed = embedUrl(m.url);
    return (
      <figure className="my-3">
        {embed ? (
          <div className="relative w-full rounded-lg overflow-hidden border border-border" style={{ aspectRatio: "16 / 9" }}>
            <iframe src={embed} title={m.caption || "video"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full" />
          </div>
        ) : (
          <video src={m.url} controls className="w-full rounded-lg border border-border" />
        )}
        {m.caption && <figcaption className="text-xs text-muted-foreground mt-1">{m.caption}</figcaption>}
      </figure>
    );
  }
  return (
    <figure className="my-3">
      <img src={m.url} alt={m.caption || "help image"} className="w-full rounded-lg border border-border" loading="lazy" />
      {m.caption && <figcaption className="text-xs text-muted-foreground mt-1">{m.caption}</figcaption>}
    </figure>
  );
}

export function Help() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get("/help");
        setArticles((res as any).data?.data ?? (res as any).data ?? []);
      } catch { setArticles([]); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 lg:px-10 pt-20 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><LifeBuoy size={22} /></div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Help &amp; Guidelines</h1>
            <p className="text-sm text-muted-foreground">Guidance and how-to material for your role.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : articles.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center">
            <PlayCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-foreground">No help content yet</p>
            <p className="text-sm text-muted-foreground mt-1">Your administrator hasn't published any guidance for your role yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((a) => (
              <article key={a.id} className="bg-card border border-border rounded-xl p-5">
                <h2 className="text-lg font-semibold text-foreground">{a.title}</h2>
                {a.body && <div className="text-sm text-foreground leading-6 whitespace-pre-line mt-2">{a.body}</div>}
                {(a.media || []).map((m, i) => <MediaBlock key={i} m={m} />)}
                <div className="text-[11px] text-muted-foreground mt-3">
                  {a.created_by_name ? `Posted by ${a.created_by_name}` : "Posted by your administrator"}
                  {a.updated_at ? ` · ${new Date(a.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Help;
