// sheets_api.js
// Shared helper for viewer.html and editor.html
// Single canonical content key is handled by the caller (no multi-page routing).
// https://script.google.com/macros/s/AKfycbxNPJGn-2Rxm7cx1two7aBQrvM0atcytraXdqnnm44a8aKDf9-7rdR2LHU3XxdmWPU/exec
// Requires an Apps Script Web App that supports:
//  GET  ?action=get&key=staffride_main
//  POST ?action=save  JSON { key, html, password }
//  POST ?action=clear JSON { key, password }

const SheetsAPI = (() => {
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

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
        img { max-width: 100%; height: auto; }
        hr { border: 0; border-top: 1px solid #eee; margin: 18px 0; }
        code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
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
    const url = new URL(apiUrl);
    url.searchParams.set("action", "get");
    url.searchParams.set("key", key || "staffride_main");

    const finalUrl = cacheBust ? withCacheBust(url.toString()) : url.toString();

    const resp = await fetch(finalUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      headers: { "Accept": "application/json,text/plain,*/*" }
    });

    const text = await resp.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* ignore */ }

    if (!resp.ok) {
      return { ok: false, status: resp.status, error: (data && data.error) ? data.error : text };
    }

    if (data && typeof data === "object") {
      return {
        ok: !!data.ok,
        status: resp.status,
        key: data.key || (key || "staffride_main"),
        html: data.html || "",
        updated_at: data.updated_at || "",
        updated_by: data.updated_by || "",
        error: data.error || ""
      };
    }

    return { ok: true, status: resp.status, key, html: text, updated_at: "", updated_by: "" };
  }

  async function saveContent({ apiUrl, key, html, password = "" }) {
    const url = new URL(apiUrl);
    url.searchParams.set("action", "save");

    const resp = await fetch(url.toString(), {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: key || "staffride_main",
        html: String(html || ""),
        password: String(password || "")
      })
    });

    const text = await resp.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* ignore */ }

    if (!resp.ok) {
      return { ok: false, status: resp.status, error: (data && data.error) ? data.error : text };
    }

    if (data && typeof data === "object") {
      return {
        ok: !!data.ok,
        status: resp.status,
        key: data.key || (key || "staffride_main"),
        html: data.html || "",
        updated_at: data.updated_at || "",
        updated_by: data.updated_by || "",
        error: data.error || ""
      };
    }

    return { ok: true, status: resp.status, key, html: text, updated_at: "", updated_by: "" };
  }

  async function clearContent({ apiUrl, key, password = "" }) {
    const url = new URL(apiUrl);
    url.searchParams.set("action", "clear");

    const resp = await fetch(url.toString(), {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: key || "staffride_main",
        password: String(password || "")
      })
    });

    const text = await resp.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* ignore */ }

    if (!resp.ok) {
      return { ok: false, status: resp.status, error: (data && data.error) ? data.error : text };
    }

    if (data && typeof data === "object") {
      return {
        ok: !!data.ok,
        status: resp.status,
        key: data.key || (key || "staffride_main"),
        html: data.html || "",
        updated_at: data.updated_at || "",
        updated_by: data.updated_by || "",
        error: data.error || ""
      };
    }

    return { ok: true, status: resp.status, key, html: "", updated_at: "", updated_by: "" };
  }

  return {
    getContent,
    saveContent,
    clearContent,
    wrapIfFragment
  };
})();
