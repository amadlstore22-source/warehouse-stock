# Warehouse Stock Scanner — Setup

A phone/scanner web app that records merchandise **IN** and **OUT** of your
warehouses, stores everything in **Google Sheets**, and keeps a live running
total per item per warehouse.

You'll do this once. Takes ~15 minutes. No coding required — just copy, paste, click.

---

## What you end up with

- Open a web page on your **phone** → scan a barcode with the camera, type the
  quantity, pick the warehouse → tap **Stock IN**.
- Or use a **USB/Bluetooth scanner** on a computer: it types the barcode for you.
- For **Stock OUT**, you also pick a **destination** from a dropdown.
- Every scan is a row in the **Movements** sheet. The **Stock** sheet shows the
  current on-hand total automatically. Nothing is ever miscounted by hand.

---

## Part 1 — Create the Google Sheet

1. Go to **https://sheets.google.com** and click **Blank** to make a new sheet.
2. Rename it (top-left) to **Warehouse Stock**.

## Part 2 — Add the backend script

3. In the sheet's menu, click **Extensions → Apps Script**. A new tab opens.
4. Delete whatever code is in the editor (usually an empty `function myFunction() {}`).
5. Open **`Code.gs`** from this folder, copy **all** of it, and paste it into the
   Apps Script editor.
6. **Pick your secret token.** Near the top of the pasted code, find:
   ```
   var API_TOKEN = 'CHANGE-ME-to-a-random-string';
   ```
   Replace `CHANGE-ME-to-a-random-string` with your own random text, e.g.
   `warehouse-7Kp2qLx9`. **Remember it — you'll paste the same value into the web app.**
7. Click the **💾 Save** icon (or Ctrl+S).

## Part 3 — Create the tabs

8. At the top of the Apps Script editor, there's a function dropdown (says
   `doGet` or similar). Choose **`setup`**.
9. Click **▶ Run**.
10. Google asks for permission the first time:
    - Click **Review permissions** → choose your Google account.
    - You may see "Google hasn't verified this app" → click **Advanced** →
      **Go to Warehouse Stock (unsafe)**. (It's *your own* script — this is normal.)
    - Click **Allow**.
11. Go back to the **Sheet** tab. You should now see new tabs at the bottom:
    **Movements, Items, Warehouses, Destinations, Stock**. 🎉

## Part 4 — Fill in your warehouses and destinations

12. Click the **Warehouses** tab. Under the "Warehouse" header, type your real
    warehouse names, one per row (e.g. `Main Warehouse`, `India`). Add as many as
    you like, anytime — the app picks them up next time it loads.
13. Click the **Destinations** tab. List where stock goes when it leaves
    (`Shop 1`, `Shop 2`, `Shop 3`, clients, other warehouses), one per row. Edit
    or add to this whenever you want.
14. Click the **Units** tab. These are the packaging options shown when scanning
    (`Single`, `Packet of 12`, `Box of 6`, …). Add/edit your own. Stock is tracked
    **separately per unit**, so 5 "Packet of 12" and 40 "Single" stay distinct.
15. *(Optional — your existing item list)* Click the **Items** tab. Paste your
    barcodes in column A and item names in column B. Unknown barcodes will still
    prompt for a name on first scan, so this is optional.

## Part 5 — Publish the script as a web app

15. Back in the **Apps Script** tab, click **Deploy → New deployment** (top right).
16. Click the ⚙️ gear next to "Select type" → choose **Web app**.
17. Set:
    - **Description:** `Warehouse scanner`
    - **Execute as:** **Me**
    - **Who has access:** **Anyone**  ← required so your phone can reach it.
      (The token from Part 2 is what actually protects it.)
18. Click **Deploy** → **Authorize access** if asked → **Done**.
19. Copy the **Web app URL** it shows you. It looks like:
    `https://script.google.com/macros/s/AKfy...../exec`

## Part 6 — Connect the web app

20. Open **`index.html`** from this folder in a text editor. Near the top find:
    ```js
    const API_URL   = 'PASTE_YOUR_WEB_APP_URL_HERE';
    const API_TOKEN = 'CHANGE-ME-to-a-random-string';
    ```
21. Paste your **Web app URL** into `API_URL`, and your **token** (from Part 2)
    into `API_TOKEN`. Save the file.

That's it — you're ready. See **USING.md** for how to open it on your phone and
daily use.

---

## Fixing mistakes

You never edit totals directly. To correct an error, just record the opposite
movement (a Stock IN to undo a wrong OUT, etc.), or delete the bad row in the
**Movements** tab — the **Stock** total recalculates instantly.

## If you change warehouses/destinations later

Just edit the **Warehouses** / **Destinations** tabs. The app picks up changes
the next time it loads.

## If you change the script later

Re-deploy: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
(The URL stays the same.)
