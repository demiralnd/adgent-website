<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>Sitemap — Adgent</title>
        <style>
          :root{
            --font-ui:"Plus Jakarta Sans",ui-sans-serif,system-ui,-apple-system,sans-serif;
            --font-mono:"Geist Mono",ui-monospace,"SFMono-Regular",Menlo,monospace;
            --accent:#ff5a2c;--accent-soft:rgba(255,90,44,0.11);
            --bg-app:#f3f2ef;--bg-card:#ffffff;--bg-sub:#f7f6f3;
            --border:rgba(28,25,20,0.10);--border-2:rgba(28,25,20,0.16);
            --text:#1c1a17;--text-2:#6c685f;--text-3:#9a958a;
          }
          @media (prefers-color-scheme:dark){:root{
            --accent:#ff6a3d;--accent-soft:rgba(255,106,61,0.15);
            --bg-app:#151310;--bg-card:#1f1c18;--bg-sub:#1a1714;
            --border:rgba(240,236,228,0.10);--border-2:rgba(240,236,228,0.16);
            --text:#f3efe7;--text-2:#b3ac9f;--text-3:#878175;}}
          *{box-sizing:border-box;margin:0;padding:0;}
          body{background:var(--bg-app);color:var(--text);font-family:var(--font-ui);
            font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;padding:40px 24px;}
          .wrap{max-width:960px;margin:0 auto;}
          .brand{display:inline-flex;align-items:center;gap:10px;margin-bottom:26px;}
          .brand .mark{width:30px;height:30px;border-radius:8px;display:block;}
          .brand .name{font-weight:800;font-size:19px;letter-spacing:-0.03em;}
          .eyebrow{font-family:var(--font-mono);font-size:11px;font-weight:500;letter-spacing:0.14em;
            text-transform:uppercase;color:var(--accent);}
          h1{font-size:28px;font-weight:700;letter-spacing:-0.03em;margin:8px 0 6px;}
          .sub{color:var(--text-2);font-size:14px;margin-bottom:28px;}
          .sub b{color:var(--text);font-weight:600;}
          table{width:100%;border-collapse:separate;border-spacing:0;background:var(--bg-card);
            border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(28,25,20,0.05);}
          th{text-align:left;font-family:var(--font-mono);font-size:11px;font-weight:600;
            letter-spacing:0.06em;text-transform:uppercase;color:var(--text-3);background:var(--bg-sub);
            padding:13px 18px;border-bottom:1px solid var(--border-2);}
          td{padding:13px 18px;border-bottom:1px solid var(--border);font-size:14px;vertical-align:middle;}
          tr:last-child td{border-bottom:none;}
          tr:hover td{background:var(--accent-soft);}
          td.url a{color:var(--text);text-decoration:none;font-weight:500;}
          td.url a:hover{color:var(--accent);}
          td.meta{font-family:var(--font-mono);font-size:12.5px;color:var(--text-2);font-variant-numeric:tabular-nums;white-space:nowrap;}
          .pri{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:999px;
            background:var(--accent-soft);color:var(--accent);font-family:var(--font-mono);font-size:11px;font-weight:600;}
          .foot{margin-top:22px;font-family:var(--font-mono);font-size:12px;color:var(--text-3);letter-spacing:0.02em;}
          .count{color:var(--accent);}
        </style>
      </head>
      <body>
        <div class="wrap">
          <a class="brand" href="https://adgent.app/">
            <svg class="mark" viewBox="0 0 96 96" aria-label="Adgent"><rect width="96" height="96" rx="22" fill="var(--accent)"/><g transform="translate(48,49) scale(0.44) translate(-85,-82)"><path d="M14 140 L85 6 L156 140 L128 140 L85 58 L42 140 Z" fill="#fff"/><path d="M50 140 L85 72 L120 140 L96 140 L85 118 L74 140 Z" fill="#fff"/><path d="M18 153 L152 153" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity="0.62"/></g></svg>
            <span class="name">Adgent</span>
          </a>
          <div class="eyebrow">XML Sitemap</div>
          <h1>All pages, one map.</h1>
          <p class="sub">This is Adgent's machine-readable sitemap — <b><xsl:value-of select="count(s:urlset/s:url)"/> URLs</b> for search engines and AI crawlers. Humans, browse the <a href="https://adgent.app/" style="color:var(--accent)">site</a> instead.</p>
          <table>
            <thead>
              <tr><th>URL</th><th>Last modified</th><th>Change freq.</th><th>Priority</th></tr>
            </thead>
            <tbody>
              <xsl:for-each select="s:urlset/s:url">
                <tr>
                  <td class="url"><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                  <td class="meta"><xsl:value-of select="s:lastmod"/><xsl:if test="not(s:lastmod)">—</xsl:if></td>
                  <td class="meta"><xsl:value-of select="s:changefreq"/><xsl:if test="not(s:changefreq)">—</xsl:if></td>
                  <td><span class="pri"><xsl:value-of select="s:priority"/></span></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
          <p class="foot"><span class="count"><xsl:value-of select="count(s:urlset/s:url)"/></span> URLs · adgent.app</p>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
