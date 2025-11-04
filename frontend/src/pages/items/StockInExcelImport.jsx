import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import API from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import { Download, Send } from "lucide-react";

/**
 * Expected headers (sheet row 1):
 *  A: Model   (optional – used only to help identify Item)
 *  B: Item    (required; matches Item.name)
 *  C: Warehouse (required; matches Warehouse.name)
 *  D: Rack      (optional; matches Location.name)
 *  E: Quantity  (required; positive number)
 *  F: Date      (required; date, ISO, or Excel serial)
 *  G: Remarks   (optional)
 */

const REQUIRED_HEADERS = ["Model", "Item", "Warehouse", "Rack", "Quantity", "Date", "Remarks"];

const StockInExcelImport = () => {
  const [rows, setRows] = useState([]);       // parsed & normalized rows (UI preview)
  const [rawFile, setRawFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- helpers ---------------------------------------------------------------

  // robust Excel cell -> JS Date
  const parseExcelDate = (value) => {
    if (value instanceof Date && !isNaN(value.getTime())) return value;

    if (typeof value === "number") {
      // Excel serial -> JS Date (UTC midnight)
      // 25569 is Excel epoch (Jan 1, 1970) in days
      const utc = new Date(Math.round((value - 25569) * 86400 * 1000));
      return utc;
    }

    if (typeof value === "string") {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  };

  const formatISODateOnly = (date) => {
    // If you want explicit IST conversion, uncomment the next line:
    // date = new Date(date.getTime() + 330 * 60 * 1000); // UTC+5:30
    return date.toISOString().split("T")[0]; // yyyy-mm-dd
  };

  const headerCheck = (headers) => {
    // Allow extra headers; just ensure we have all required ones
    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    return { ok: missing.length === 0, missing };
  };

  // --- file handling ---------------------------------------------------------

  const handleFileUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setRawFile(f);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        // NOTE: cellDates helps get Date objects when possible
        const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" }); // array of objects by header

        if (json.length === 0) {
          toast.error("❌ Sheet is empty.");
          setRows([]);
          return;
        }

        // Validate headers from the first row's keys
        const incomingHeaders = Object.keys(json[0]);
        const { ok, missing } = headerCheck(incomingHeaders);
        if (!ok) {
          toast.error(`❌ Template mismatch. Missing columns: ${missing.join(", ")}`);
          setRows([]);
          return;
        }

        // Normalize & light validation for preview only
        const normalized = json.map((r, i) => {
          const qty = Number(r["Quantity"]);
          const date = parseExcelDate(r["Date"]);

          return {
            _row: i + 2, // excel row number (1-based plus header row)
            model: String(r["Model"] || "").trim(),
            itemName: String(r["Item"] || "").trim(),
            warehouseName: String(r["Warehouse"] || "").trim(),
            locationName: String(r["Rack"] || "").trim(),
            quantity: Number.isFinite(qty) ? qty : NaN,
            date: date,
            remarks: String(r["Remarks"] || "").trim(),
          };
        });

        setRows(normalized);
        toast.success("✅ File parsed. Review and click Import.");
      } catch (err) {
        console.error(err);
        toast.error("❌ Failed to parse Excel file.");
        setRows([]);
      }
    };

    reader.readAsBinaryString(f);
  };

  // --- API data lookup & import ---------------------------------------------

  const handleImport = async () => {
    if (rows.length === 0) {
      toast.error("❌ Nothing to import.");
      return;
    }

    // Deep validation before hitting API
    const bad = rows.find(
      (r) =>
        !r.itemName ||
        !r.warehouseName ||
        !Number.isFinite(r.quantity) ||
        r.quantity <= 0 ||
        !r.date
    );
    if (bad) {
      toast.error(
        `❌ Invalid data at Excel row ${bad._row}. Check item/warehouse/date/quantity.`
      );
      return;
    }

    setLoading(true);
    try {
      // 1) fetch ref data for ID resolution
      const [itemsRes, whRes, locRes] = await Promise.all([
        API.get("/items"),
        API.get("/warehouses"),
        API.get("/locations"),
      ]);

      // items can be {items:[...] } or [...]
      const itemArray = Array.isArray(itemsRes.data)
        ? itemsRes.data
        : Array.isArray(itemsRes.data?.items)
        ? itemsRes.data.items
        : [];

      const itemsByName = new Map(
        itemArray.map((it) => [String(it.name || "").trim().toLowerCase(), it])
      );

      // Also try a secondary index by modelNo (optional)
      const itemsByModel = new Map(
        itemArray
          .filter((it) => it.modelNo)
          .map((it) => [String(it.modelNo).trim().toLowerCase(), it])
      );

      const warehouses = Array.isArray(whRes.data) ? whRes.data : [];
      const warehousesByName = new Map(
        warehouses.map((w) => [String(w.name || "").trim().toLowerCase(), w])
      );

      const locations = Array.isArray(locRes.data) ? locRes.data : [];
      const locationsByName = new Map(
        locations.map((l) => [String(l.name || "").trim().toLowerCase(), l])
      );

      // 2) map to payload rows (resolve IDs)
      const mapped = rows.map((r) => {
        // Resolve item by name, then by model as fallback
        const itemHit =
          itemsByName.get(r.itemName.toLowerCase()) ||
          (r.model ? itemsByModel.get(r.model.toLowerCase()) : undefined);

        if (!itemHit) {
          throw new Error(
            `Item "${r.itemName}" (model: ${r.model || "-"}) not found. Row ${r._row}`
          );
        }

        const wh = warehousesByName.get(r.warehouseName.toLowerCase());
        if (!wh) {
          throw new Error(`Warehouse "${r.warehouseName}" not found. Row ${r._row}`);
        }

        const loc = r.locationName
          ? locationsByName.get(r.locationName.toLowerCase())
          : null;

        const dateOnly = formatISODateOnly(r.date);

        return {
          item: itemHit._id,                 // <-- backend expects ObjectId
          warehouse: wh._id,                 // <-- backend expects ObjectId
          location: loc ? loc._id : null,    // <-- optional
          quantity: r.quantity,
          date: dateOnly,                    // "yyyy-mm-dd"
          remarks: r.remarks || "",
        };
      });

      // 3) aggregate duplicates (same item+warehouse+location+date) -> sum qty
      const aggMap = new Map();
      for (const m of mapped) {
        const k = `${m.item}|${m.warehouse}|${m.location || ""}|${m.date}`;
        const prev = aggMap.get(k);
        if (!prev) aggMap.set(k, { ...m });
        else prev.quantity += m.quantity;
      }
      const aggregated = Array.from(aggMap.values());

      // 4) POST to backend (bulk)
      // If your backend uses a different bulk route, change below accordingly.
      await API.post("/stock-in", {
        items: aggregated,
        date: new Date(),              // master doc date, if your API uses it
        remarks: "Imported via Excel", // optional note
      });

      toast.success(`✅ Imported ${aggregated.length} row(s) successfully.`);
      setRows([]);
      setRawFile(null);
    } catch (err) {
      console.error("Import error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to import. Please check the sheet.";
      toast.error(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // --- UI --------------------------------------------------------------------

  const canImport = rows.length > 0 && !loading;

  // Small preview (max 8 rows)
  const preview = useMemo(() => rows.slice(0, 8), [rows]);

  const downloadFormat = () => {
    // The file "StockIn_Template.xlsx" must be present in /frontend/public
    const url = "/StockIn_Template.xlsx";
    const a = document.createElement("a");
    a.href = url;
    a.download = "StockIn_Template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h2 className="text-2xl font-semibold text-blue-700 mb-6">
          Import Stock In (Excel)
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Excel File
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="w-full px-4 py-2 border border-gray-300 rounded"
            />
            {rawFile && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: <b>{rawFile.name}</b>
              </p>
            )}
          </div>

          <div className="flex justify-between gap-4">
            <button
              onClick={downloadFormat}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              type="button"
            >
              <Download className="w-4 h-4" />
              Download Format
            </button>

            <button
              onClick={handleImport}
              disabled={!canImport}
              className={`flex items-center gap-2 px-4 py-2 rounded transition ${
                canImport
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-300 text-gray-700 cursor-not-allowed"
              }`}
              type="button"
            >
              <Send className="w-4 h-4" />
              {loading ? "Importing..." : "Import Stock"}
            </button>
          </div>

          {/* Preview */}
          {rows.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-2 text-gray-800">
                Preview (first {preview.length} rows of {rows.length})
              </h3>
              <div className="overflow-x-auto rounded border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 border">#</th>
                      <th className="px-2 py-1 border">Model</th>
                      <th className="px-2 py-1 border">Item</th>
                      <th className="px-2 py-1 border">Warehouse</th>
                      <th className="px-2 py-1 border">Rack</th>
                      <th className="px-2 py-1 border">Qty</th>
                      <th className="px-2 py-1 border">Date</th>
                      <th className="px-2 py-1 border">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-2 py-1 border">{r._row}</td>
                        <td className="px-2 py-1 border">{r.model || "-"}</td>
                        <td className="px-2 py-1 border">{r.itemName}</td>
                        <td className="px-2 py-1 border">{r.warehouseName}</td>
                        <td className="px-2 py-1 border">{r.locationName || "-"}</td>
                        <td className="px-2 py-1 border">
                          {Number.isFinite(r.quantity) ? r.quantity : "⚠️"}
                        </td>
                        <td className="px-2 py-1 border">
                          {r.date ? formatISODateOnly(r.date) : "⚠️"}
                        </td>
                        <td className="px-2 py-1 border">{r.remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Duplicates (same Item + Warehouse + Rack + Date) will be
                aggregated before import.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockInExcelImport;
