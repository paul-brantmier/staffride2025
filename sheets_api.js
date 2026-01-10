// sheets_api.js
// Shared helper for viewer.html and editor.html
// Single canonical content key is handled by the caller (no multi-page routing).
// Requires an Apps Script Web App that supports:
//  GET  ?action=get&key=staffride_main
//  POST ?action=save  form { key, html, password }
//  POST ?action=clear form { key, password }

const SheetsAPI = (() => {
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function wrapIfFragment(inputHtml, opts = {}) {
    const s = (inputHtml || "").trim();
    const looksFullDoc = /<html[\s>]/i.test(s) || /<!doctype html>/i.test(s);
    if (looksFullDoc) return s;

    const title = opts.title || "Document";
    const includeBaseStyles = !!opts.includeBaseStyles;

    const baseStyles = includeBaseStyles
      ? `
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
      </style>`
      : "";

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

  // JSONP helper (avoids CORS read restrictions for Apps Script GET)
  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const cbName = "__jsonp_cb_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("JSONP timeout"));
      }, 15000);

      function cleanup() {
        clearTimeout(timeout);
        try {
          delete window[cbName];
        } catch {
          window[cbName] = undefined;
        }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = (data) => {
        cleanup();
        resolve(data);
      };

      const u = new URL(url);
      u.searchParams.set("callback", cbName);
      u.searchParams.set("cb", String(Date.now())); // cache bust

      script.src = u.toString();
      script.onerror = () => {
        cleanup();
        reject(new Error("JSONP load failed"));
      };

      document.head.appendChild(script);
    });
  }

  async function getContent({ apiUrl, key, cacheBust = false } = {}) {
    const url = new URL(apiUrl);
    url.searchParams.set("action", "get");
    url.searchParams.set("key", key || "staffride_main");
    if (cacheBust) url.searchParams.set("cb", String(Date.now()));

    const data = await jsonp(url.toString());

    // Normalize to same shape your app expects
    return {
      ok: !!data.ok,
      status: 200,
      key: data.key || (key || "staffride_main"),
      html: data.html || "",
      updated_at: data.updated_at || "",
      updated_by: data.updated_by || "",
      error: data.error || ""
    };
  }

  async function saveContent({ apiUrl, key, html, password = "" } = {}) {
    const url = new URL(apiUrl);
    url.searchParams.set("action", "save");

    const form = new URLSearchParams();
    form.set("key", key || "staffride_main");
    form.set("html", String(html || ""));
    form.set("password", String(password || ""));

    // Send the write without needing CORS-readable response
    await fetch(url.toString(), {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: form.toString()
    });

    // Confirm by reloading canonical content via GET
    return await getContent({ apiUrl, key, cacheBust: true });
  }

  async function clearContent({ apiUrl, key, password = "" } = {}) {
    const url = new URL(apiUrl);
    url.searchParams.set("action", "clear");

    const form = new URLSearchParams();
    form.set("key", key || "staffride_main");
    form.set("password", String(password || ""));

    await fetch(url.toString(), {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: form.toString()
    });

    return await getContent({ apiUrl, key, cacheBust: true });
  }

  return {
    getContent,
    saveContent,
    clearContent,
    wrapIfFragment
  };
})();
