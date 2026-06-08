/**
 * Warehouse Stock Tracker — Google Apps Script backend
 * ----------------------------------------------------
 * This script turns a Google Sheet into the backend for the scanner web app.
 * It is deployed as a Web App (Deploy > New deployment > Web app).
 *
 * Tabs it uses (created automatically on first run via setup()):
 *   - Movements   : the append-only log of every scan (IN / OUT)
 *   - Items       : barcode -> item name (the remembered catalog)
 *   - Warehouses  : list of warehouse names (dropdown source)
 *   - Destinations: list of destinations for OUT (dropdown source)
 *   - Stock       : live running total per item per warehouse (a formula view)
 *
 * Nothing here is destructive: stock is always derived by summing Movements,
 * so a mistake is fixed by adding a correcting row, never by editing totals.
 */

// A shared secret so random people who find the URL can't write to your sheet.
// Change this to your own random string, and put the SAME string in index.html.
var API_TOKEN = 'CHANGE-ME-to-a-random-string';

var SHEETS = {
  movements: 'Movements',
  items: 'Items',
  warehouses: 'Warehouses',
  destinations: 'Destinations',
  units: 'Units',
  stock: 'Stock'
};

/** Entry point for GET requests (used to load dropdowns + item lookups). */
function doGet(e) {
  return handle_(e);
}

/** Entry point for POST requests (used to record a scan). */
function doPost(e) {
  return handle_(e);
}

function handle_(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    // POST bodies arrive as JSON; merge them over the query params.
    if (e && e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      for (var k in body) { params[k] = body[k]; }
    }

    if (params.token !== API_TOKEN) {
      return json_({ ok: false, error: 'Unauthorized — wrong token.' });
    }

    switch (params.action) {
      case 'bootstrap':  return json_(bootstrap_());
      case 'lookup':     return json_(lookupItem_(params.barcode));
      case 'record':     return json_(record_(params));
      default:           return json_({ ok: false, error: 'Unknown action: ' + params.action });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Returns everything the app needs on load: warehouses, destinations, and current stock. */
function bootstrap_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    ok: true,
    warehouses: readColumn_(SHEETS.warehouses),
    destinations: readColumn_(SHEETS.destinations),
    units: readColumn_(SHEETS.units),
    items: readItems_(),
    stock: readStock_()
  };
}

/** Looks up an item name by barcode. Returns name:'' if unknown. */
function lookupItem_(barcode) {
  if (!barcode) return { ok: false, error: 'No barcode provided.' };
  barcode = String(barcode).trim();
  var sheet = getSheet_(SHEETS.items);
  var values = sheet.getDataRange().getValues(); // [Barcode, Item Name]
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === barcode) {
      return { ok: true, barcode: barcode, name: String(values[i][1]).trim(), known: true };
    }
  }
  return { ok: true, barcode: barcode, name: '', known: false };
}

/**
 * Records a movement (IN or OUT) and remembers the item name if new.
 * Required params: type (IN|OUT), barcode, name, quantity, warehouse.
 * OUT also expects: destination.
 */
function record_(p) {
  var type = String(p.type || '').toUpperCase();
  if (type !== 'IN' && type !== 'OUT') return { ok: false, error: 'type must be IN or OUT.' };

  var barcode = String(p.barcode || '').trim();
  var name = String(p.name || '').trim();
  var unit = String(p.unit || '').trim() || 'Single'; // packaging, e.g. "Packet of 12"
  var qty = Number(p.quantity);
  var warehouse = String(p.warehouse || '').trim();
  var destination = String(p.destination || '').trim();

  if (!barcode) return { ok: false, error: 'Barcode is required.' };
  if (!qty || qty <= 0) return { ok: false, error: 'Quantity must be a positive number.' };
  if (!warehouse) return { ok: false, error: 'Warehouse is required.' };
  if (type === 'OUT' && !destination) return { ok: false, error: 'Destination is required for stock OUT.' };

  // Remember / update the item name so future scans auto-fill.
  if (name) rememberItem_(barcode, name);
  if (!name) {
    var found = lookupItem_(barcode);
    name = found.name || '(unnamed)';
  }

  // Signed quantity: IN is positive, OUT is negative — keeps the running total a simple SUM.
  var signed = (type === 'IN') ? qty : -qty;

  var sheet = getSheet_(SHEETS.movements);
  sheet.appendRow([
    new Date(),                 // Timestamp        col A
    type,                       // IN / OUT         col B
    barcode,                    // Barcode          col C
    name,                       // Item Name        col D
    unit,                       // Unit/packaging   col E
    qty,                        // Quantity         col F
    signed,                     // Signed Qty       col G  (running total)
    warehouse,                  // Warehouse        col H
    (type === 'OUT' ? destination : ''), // Destination col I
    (p.note || '')              // Optional note    col J
  ]);

  // Compute the new on-hand for this item+unit at this warehouse so the app can confirm it.
  var onHand = stockFor_(barcode, warehouse, unit);
  return { ok: true, barcode: barcode, name: name, unit: unit, warehouse: warehouse, onHand: onHand };
}

/* ----------------------------- helpers ----------------------------- */

function rememberItem_(barcode, name) {
  var sheet = getSheet_(SHEETS.items);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === barcode) {
      if (String(values[i][1]).trim() !== name) sheet.getRange(i + 1, 2).setValue(name);
      return;
    }
  }
  sheet.appendRow([barcode, name]);
}

/** Sums signed quantities for one barcode + unit at one warehouse.
 *  Column indices: C=2 barcode, E=4 unit, G=6 signed qty, H=7 warehouse. */
function stockFor_(barcode, warehouse, unit) {
  var sheet = getSheet_(SHEETS.movements);
  var values = sheet.getDataRange().getValues(); // header in row 1
  var total = 0;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][2]).trim() === barcode &&
        String(values[i][7]).trim() === warehouse &&
        String(values[i][4]).trim() === unit) {
      total += Number(values[i][6]) || 0;
    }
  }
  return total;
}

/** Builds the full stock table grouped by barcode + warehouse + unit. */
function readStock_() {
  var sheet = getSheet_(SHEETS.movements);
  var values = sheet.getDataRange().getValues();
  var map = {}; // key = barcode||warehouse||unit
  for (var i = 1; i < values.length; i++) {
    var barcode = String(values[i][2]).trim();
    var name = String(values[i][3]).trim();
    var unit = String(values[i][4]).trim() || 'Single';
    var warehouse = String(values[i][7]).trim();
    if (!barcode || !warehouse) continue;
    var key = barcode + '||' + warehouse + '||' + unit;
    if (!map[key]) map[key] = { barcode: barcode, name: name, unit: unit, warehouse: warehouse, qty: 0 };
    map[key].qty += Number(values[i][6]) || 0;
    if (name) map[key].name = name;
  }
  var out = [];
  for (var k in map) out.push(map[k]);
  out.sort(function (a, b) {
    return a.name.localeCompare(b.name) ||
           a.warehouse.localeCompare(b.warehouse) ||
           a.unit.localeCompare(b.unit);
  });
  return out;
}

/** Returns the known-items catalog as [{barcode, name}], used by the no-barcode picker. */
function readItems_() {
  var sheet = getSheet_(SHEETS.items);
  var values = sheet.getDataRange().getValues(); // [Barcode, Item Name]
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var code = String(values[i][0]).trim();
    var name = String(values[i][1]).trim();
    if (name) out.push({ barcode: code, name: name });
  }
  out.sort(function (a, b) { return a.name.localeCompare(b.name); });
  return out;
}

function readColumn_(sheetName) {
  var sheet = getSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var v = String(values[i][0]).trim();
    if (v) out.push(v);
  }
  return out;
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run this ONCE from the Apps Script editor (select 'setup' and click Run)
 * to create all tabs with headers and a couple of starter rows.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var HEADERS = ['Timestamp', 'Type', 'Barcode', 'Item Name', 'Unit',
    'Quantity', 'Signed Qty', 'Warehouse', 'Destination', 'Note'];

  var movements = getSheet_(SHEETS.movements);
  if (movements.getLastRow() === 0) {
    movements.appendRow(HEADERS);
  } else {
    // Migrate an OLDER sheet that has no 'Unit' column: insert it after 'Item Name' (col D).
    var firstRow = movements.getRange(1, 1, 1, movements.getLastColumn()).getValues()[0];
    if (firstRow.indexOf('Unit') === -1) {
      movements.insertColumnAfter(4);              // new blank column E
      movements.getRange(1, 5).setValue('Unit');   // header
      var rows = movements.getLastRow() - 1;
      if (rows > 0) movements.getRange(2, 5, rows, 1).setValue('Single'); // backfill existing
      SpreadsheetApp.getActiveSpreadsheet()
        .toast('Migrated Movements: added Unit column (existing rows set to "Single").', 'Warehouse Stock', 6);
    }
  }
  movements.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  movements.setFrozenRows(1);
  // Make the Timestamp column show both date and time clearly.
  movements.getRange('A2:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');

  var items = getSheet_(SHEETS.items);
  if (items.getLastRow() === 0) {
    items.appendRow(['Barcode', 'Item Name']);
    items.getRange('A1:B1').setFontWeight('bold');
    items.setFrozenRows(1);
  }

  var warehouses = getSheet_(SHEETS.warehouses);
  if (warehouses.getLastRow() === 0) {
    warehouses.appendRow(['Warehouse']);
    warehouses.getRange('A1').setFontWeight('bold');
    warehouses.appendRow(['Main Warehouse']);
    warehouses.setFrozenRows(1);
  }

  var destinations = getSheet_(SHEETS.destinations);
  if (destinations.getLastRow() === 0) {
    destinations.appendRow(['Destination']);
    destinations.getRange('A1').setFontWeight('bold');
    destinations.appendRow(['Shop 1']);
    destinations.appendRow(['Shop 2']);
    destinations.appendRow(['Shop 3']);
    destinations.setFrozenRows(1);
  }

  // Units / packaging — you edit this list yourself, like warehouses & destinations.
  var units = getSheet_(SHEETS.units);
  if (units.getLastRow() === 0) {
    units.appendRow(['Unit']);
    units.getRange('A1').setFontWeight('bold');
    ['Single', 'Packet of 6', 'Packet of 12', 'Box of 6', 'Box of 12']
      .forEach(function (u) { units.appendRow([u]); });
    units.setFrozenRows(1);
  }

  // Live stock view driven by a formula, so you can glance at the sheet too.
  // Columns now: C=Barcode, D=Item Name, E=Unit, G=Signed Qty, H=Warehouse.
  var stock = getSheet_(SHEETS.stock);
  stock.clear();
  stock.appendRow(['Item Name', 'Barcode', 'Unit', 'Warehouse', 'On Hand']);
  stock.getRange('A1:E1').setFontWeight('bold');
  stock.setFrozenRows(1);
  // QUERY pivots the Movements log into per-item, per-unit, per-warehouse totals.
  stock.getRange('A2').setFormula(
    "=IFERROR(QUERY(Movements!C2:H, " +
    "\"select D, C, E, H, sum(G) where C is not null group by D, C, E, H label sum(G) ''\", 0), )"
  );

  SpreadsheetApp.getActiveSpreadsheet().toast('Setup complete — all tabs created.', 'Warehouse Stock', 5);
}
