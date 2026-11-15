// Régénère lib/data/pays-fuseaux.json depuis la base des fuseaux du système (/usr/share/zoneinfo/zone.tab).
import fs from "node:fs";
const lines = fs.readFileSync("/usr/share/zoneinfo/zone.tab", "utf8").split("\n").filter((l) => l && !l.startsWith("#"));
const names = new Intl.DisplayNames(["fr"], { type: "region" });
const by = {};
for (const l of lines) {
  const [cc, , tz] = l.split("\t");
  try { new Intl.DateTimeFormat("fr", { timeZone: tz }); } catch { continue; }
  (by[cc] ||= []).push(tz);
}
const city = (tz) => tz.split("/").slice(1).join(" / ").replace(/_/g, " ");
const out = Object.entries(by)
  .map(([code, zones]) => ({ code, name: names.of(code), zones: zones.map((id) => ({ id, city: city(id) })).sort((a, b) => a.city.localeCompare(b.city, "fr")) }))
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));
fs.writeFileSync("lib/data/pays-fuseaux.json", JSON.stringify(out));
console.log(`${out.length} pays, ${lines.length} fuseaux`);
