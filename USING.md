# Daily Use

## Opening it on your phone

The simplest way: put `index.html` somewhere your phone can open it.

**Easiest (no hosting):** email yourself the `index.html` file, open it on your
phone, and "Add to Home Screen" so it's one tap. Or use any free static host
(GitHub Pages, Netlify drop) and bookmark the link.

> The camera scanner only works over **https** (or when the file is opened
> locally). Free hosts like GitHub Pages / Netlify give you https automatically.

## Recording stock that ARRIVES (Stock IN)

1. Make sure **⬇️ Stock IN** is selected (green).
2. **Scan the barcode** — tap **📷 Camera** and point at it, *or* use a hardware
   scanner (it types the code and the app reads it automatically).
3. If it's a known item, the **name auto-fills**. If it's new, type the name once
   — it's remembered forever.
4. Type the **quantity** that arrived.
5. Pick the **warehouse** it's going into.
6. Tap **Record Stock IN**. You'll see e.g. `＋24 Olive Oil 1L → 124 on hand`.

## Recording stock that LEAVES (Stock OUT)

1. Tap **⬆️ Stock OUT** (turns red).
2. Scan the barcode (auto-fills the name).
3. Type the **quantity** leaving.
4. Pick the **warehouse** it's leaving from.
5. Pick the **destination** (where it's going).
6. Tap **Record Stock OUT**. The amount is subtracted automatically.

## Checking current stock

Tap **📊 Current stock** at the bottom to see on-hand totals per item per
warehouse. Negative numbers show in red — that means more left than arrived,
so a scan was missed somewhere.

## With a hardware scanner (USB / Bluetooth)

A barcode scanner acts like a keyboard. Just:
1. Click into the **Barcode** field (or it's already focused after each scan).
2. Scan — the code appears and the name looks up automatically.
3. Type quantity, pick warehouse, click Record.

Most scanners send an "Enter" after the code, which the app handles. Workflow is:
**scan → type qty → Enter/click Record → repeat.**

## Tips

- The **warehouse stays selected** between scans, so receiving a whole pallet into
  one warehouse is fast: scan, qty, record, scan, qty, record…
- Everything lives in your Google Sheet — share it with coworkers (read-only or
  edit) from the normal Sheets **Share** button.
- Reports: the **Movements** tab is a full history you can filter/pivot in Sheets
  (by date, item, warehouse, destination) however you like.
