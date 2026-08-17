# Product demo — local only

A working mock of the Adgent workspace, driven by fixed prompts. Not linked from
the site and excluded from the sitemap/llms feeds until it is deliberately placed.

    python3 serve.py        # then open http://127.0.0.1:8899/demo/

Design is lifted from the product itself (`tiknaosman/adgent`, origin/master
@6abb288 — the agent-first workspace landed in 2bcc0f6), not invented:

  - shell: sidebar | chat column (never closable) | tabbed canvas
  - tokens: the same --accent #ff5a2c / --bg-app #f3f2ef / Jakarta + Geist Mono
  - the daily brief renders as a newspaper sheet: double-rule masthead, a centre
    fold line, two rotated paper layers behind it
  - approval cards carry a per-action glyph, the before-state, and Approve/Reject

Data is mock. Every number in it is one the site already publishes, so the demo
and the copy cannot drift apart.
