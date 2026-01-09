// sheets_api.js
// Shared helper for viewer.html and editor.html

const SheetsAPI = (() => {
  function withCacheBust(url) {
    const u = new URL(url);
    u.searchParams.set("cb", String(Date.now()));
    return u.toString();
  }

  function wrapIfFragment(inputHtml, opts = {}) {
    const s = (inputHtml || "").trim();
    const looksFullDoc = /<html[\s>]/i.test(s) || /<!doctype html>/i.test(s);
    if (looksFullDoc) return s;

    const title = opts.title || "Document";
    const includeBaseStyles = !!opts.includeBaseStyles;

    const baseStyles = includeBaseStyles ? `
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; line-height: 1.45; }
        h1,h2,h3,h4 { margin: 0.9em 0 0.4em; }
        p { margin: 0.5em 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px 10px; vertical-align: top; }
        ul, ol { padding-left: 1.4em; }
        a { word-break: break-word; }
      </style>` : "";

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  ${baseStyles}
</head>
<body>
${s}
</body>
</html>`;
  }

  async function getContent({ apiUrl, key, cacheBust = true }) {
    // Expected Apps Script endpoint shape:
    // GET  ?action=get&key=staffride_main
    // -> { ok:true, key:"...", html:"...", updated_at:"..." }
    const url = new URL(apiUrl);
    url.searchParams.set("action", "get");
    url.searchParams.set("key", key || "default");

    const finalUrl = cacheBust ? withCacheBust(url.toString()) : url.toString();

    const resp = await fetch(finalUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      headers: { "Accept": "application/json,text/plain,*/*" }
    });

    let data = null;
    const text = await resp.text();

    // Apps Script sometimes returns text even when it's JSON
    try { data = JSON.parse(text); } catch { /* ignore */ }

    if (!resp.ok) {
      return { ok: false, status: resp.status, error: (data && data.error) ? data.error : text };
    }

    if (data && typeof data === "object") {
      return {
        ok: !!data.ok,
        status: resp.status,
        html: data.html || "",
        updated_at: data.updated_at || "",
        error: data.error || ""
      };
    }

    // Fallback: if endpoint returns raw HTML
    return { ok: true, status: resp.status, html: text, updated_at: "" };
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  return { getContent, wrapIfFragment };
})();
