import { useEffect, useState } from "react";
import { ClipboardList, Plus, Trash2, Image as ImageIcon, Film, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

type Media = { type: "image" | "video"; url: string; caption?: string };
type Article = { id: string; title: string; body?: string; target_roles?: string[]; media?: Media[]; published?: boolean };

const ROLES: { value: string; label: string }[] = [
  { value: "REGISTERED_MANAGER", label: "Registered Manager" },
  { value: "TEAM_LEADER", label: "Team Leader" },
  { value: "SUPPORT_WORKER", label: "Support Worker" },
  { value: "RESPONSIBLE_INDIVIDUAL", label: "Responsible Individual" },
  { value: "DIRECTOR", label: "Director" },
  { value: "ADMIN", label: "Admin" },
];

const BLANK: Article = { id: "", title: "", body: "", target_roles: [], media: [], published: true };

export function HelpAdmin() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Article | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/help/manage");
      setArticles((res as any).data?.data ?? (res as any).data ?? []);
    } catch { toast.error("Failed to load help content"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const startNew = () => setForm({ ...BLANK, media: [] });
  const startEdit = (a: Article) => setForm({ ...BLANK, ...a, target_roles: a.target_roles || [], media: a.media || [] });

  const toggleRole = (role: string) => {
    if (!form) return;
    const has = (form.target_roles || []).includes(role);
    setForm({ ...form, target_roles: has ? (form.target_roles || []).filter((r) => r !== role) : [...(form.target_roles || []), role] });
  };

  const addMedia = (type: "image" | "video") => form && setForm({ ...form, media: [...(form.media || []), { type, url: "", caption: "" }] });
  const setMedia = (i: number, patch: Partial<Media>) => form && setForm({ ...form, media: (form.media || []).map((m, idx) => idx === i ? { ...m, ...patch } : m) });
  const removeMedia = (i: number) => form && setForm({ ...form, media: (form.media || []).filter((_, idx) => idx !== i) });

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) { toast.error("Enter a heading."); return; }
    const payload = {
      title: form.title.trim(),
      body: form.body || "",
      target_roles: form.target_roles || [],
      media: (form.media || []).filter((m) => m.url.trim()),
      published: form.published !== false,
    };
    setSaving(true);
    try {
      if (form.id) await apiClient.patch(`/help/${form.id}`, payload);
      else await apiClient.post("/help", payload);
      toast.success(form.id ? "Help content updated" : "Help content published");
      setForm(null);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const remove = async (a: Article) => {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    try { await apiClient.delete(`/help/${a.id}`); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || "Failed to delete"); }
  };

  const rolesLabel = (roles?: string[]) => !roles || roles.length === 0
    ? "All roles"
    : roles.map((r) => ROLES.find((x) => x.value === r)?.label || r).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 lg:px-10 pt-20 max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><ClipboardList size={22} /></div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Help Content</h1>
              <p className="text-sm text-muted-foreground">Publish help &amp; guidelines and choose which roles see each one.</p>
            </div>
          </div>
          {!form && (
            <button onClick={startNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              <Plus size={16} /> New article
            </button>
          )}
        </div>

        {form ? (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Heading</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. How to record a signal"
                className="w-full border border-border rounded-lg p-2.5 text-sm bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Text material</label>
              <textarea value={form.body || ""} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} placeholder="Write the guidance here…"
                className="w-full border border-border rounded-lg p-2.5 text-sm bg-background resize-y" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Who should see this?</label>
              <p className="text-xs text-muted-foreground mb-2">Leave all unticked to show it to every role.</p>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => {
                  const on = (form.target_roles || []).includes(r.value);
                  return (
                    <button key={r.value} type="button" onClick={() => toggleRole(r.value)}
                      className={`text-xs rounded-full px-3 py-1.5 border ${on ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Images &amp; videos</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => addMedia("image")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted"><ImageIcon size={13} /> Add image</button>
                  <button type="button" onClick={() => addMedia("video")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted"><Film size={13} /> Add video</button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Paste an image URL, or a YouTube/Vimeo/video URL. (Uploads use a link to the hosted file.)</p>
              <div className="space-y-2">
                {(form.media || []).map((m, i) => (
                  <div key={i} className="flex items-start gap-2 border border-border rounded-lg p-2">
                    <span className="mt-2 text-muted-foreground">{m.type === "video" ? <Film size={15} /> : <ImageIcon size={15} />}</span>
                    <div className="flex-1 space-y-1.5">
                      <input value={m.url} onChange={(e) => setMedia(i, { url: e.target.value })} placeholder={m.type === "video" ? "Video URL (YouTube / Vimeo / .mp4)" : "Image URL (https://…)"}
                        className="w-full border border-border rounded-lg p-2 text-sm bg-background" />
                      <input value={m.caption || ""} onChange={(e) => setMedia(i, { caption: e.target.value })} placeholder="Caption (optional)"
                        className="w-full border border-border rounded-lg p-2 text-xs bg-background" />
                    </div>
                    <button type="button" onClick={() => removeMedia(i)} className="mt-1 text-muted-foreground hover:text-destructive"><X size={16} /></button>
                  </div>
                ))}
                {(form.media || []).length === 0 && <p className="text-xs text-muted-foreground">No media added.</p>}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.published !== false} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Published (visible to the selected roles)
            </label>

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                {saving ? "Saving…" : form.id ? "Save changes" : "Publish"}
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : articles.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
            No help content yet. Click <span className="font-medium text-foreground">New article</span> to publish your first guide.
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{a.title}</h3>
                    {a.published === false && <span className="text-[10px] uppercase rounded px-1.5 py-0.5 bg-muted text-muted-foreground">Draft</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">For: {rolesLabel(a.target_roles)} · {(a.media || []).length} media</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(a)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" title="Edit"><Pencil size={16} /></button>
                  <button onClick={() => remove(a)} className="p-2 rounded-lg hover:bg-muted text-destructive" title="Delete"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HelpAdmin;
