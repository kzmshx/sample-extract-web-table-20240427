// @deno-types="npm:@types/node"
import { parseArgs } from "node:util";
import * as fs from "https://deno.land/std@0.223.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.223.0/path/mod.ts";
import { cheerio } from "https://deno.land/x/cheerio@1.0.7/mod.ts";
import { writeCSV } from "https://deno.land/x/csv@v0.9.2/mod.ts";

const trimText = (str: string): string => {
  return str.trim().replace(/\s+/g, " ");
};

const headText = (str: string, length: number): string => {
  return trimText(str).slice(0, length).replace(/\s+/g, "_");
};

const tableToRecords = (
  table: cheerio.Cheerio<cheerio.Element>,
): string[][] => {
  const records: string[][] = [];
  table.find("tr").map((_, tr) => {
    const record: string[] = [];
    $(tr).find("th, td").each((_, td) => {
      record.push(trimText($(td).text()));
    });
    records.push(record);
  });
  return records;
};

const { values, positionals } = parseArgs({
  args: Deno.args,
  options: {
    help: {
      type: "boolean",
      short: "h",
      multiple: false,
      default: false,
    },
    out: {
      type: "string",
      multiple: false,
      short: "o",
      default: "out",
    },
  },
  allowPositionals: true,
});

const { help, out } = values;

if (help) {
  console.log("Usage:");
  console.log("  tabmine [url ...] [options]");
  console.log("Options:");
  console.log("  -h, --help    Show this help message and exit");
  console.log("  -o, --out     Output file name");
  Deno.exit(0);
}

if (!out) {
  console.error("Output file name is required");
  Deno.exit(1);
}
if (!await fs.exists(out)) {
  await fs.ensureDir(out);
}

const url = positionals[0];

const res = await fetch(url);
const body = await res.text();

const $ = cheerio.load(body);

$("table").each((_, table) => {
  const contentHead = headText($(table).text(), 15);
  const filename = path.resolve(out, `data_${contentHead}.csv`);
  const file = Deno.openSync(filename, {
    write: true,
    create: true,
    truncate: true,
  });

  const records = tableToRecords($(table));

  writeCSV(file, records);
});
