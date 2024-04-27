// @deno-types="npm:@types/node"
import { parseArgs } from "node:util";
import * as fs from "https://deno.land/std@0.223.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.223.0/path/mod.ts";
import { cheerio } from "https://deno.land/x/cheerio@1.0.7/mod.ts";
import { writeCSV } from "https://deno.land/x/csv@v0.9.2/mod.ts";

const help = () => {
  console.log("Usage:");
  console.log("  tabmine [url ...] [options]");
  console.log("Options:");
  console.log("  -h, --help    Show this help message and exit");
  console.log("  -o, --out     Output file name");
};

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

if (values.help) {
  help();
  Deno.exit(0);
}

if (positionals.length === 0) {
  console.error("url is required");
  help();
  Deno.exit(1);
}

const out = values.out;
if (!out) {
  console.error("Output file name is required");
  help();
  Deno.exit(1);
}

if (!await fs.exists(out)) {
  await fs.ensureDir(out);
}

const url = positionals[0];
const response = await fetch(url);
const $ = cheerio.load(await response.text());

const tables: { contentHead: string; records: string[][] }[] = [];

$("table").each((_, table) => {
  const contentHead = headText($(table).text(), 15);
  const records = tableToRecords($(table));
  tables.push({ contentHead, records });
});

for (const { contentHead, records } of tables) {
  const filename = path.join(out, `data_${contentHead}.csv`);
  const file = await Deno.open(filename, {
    create: true,
    write: true,
    truncate: true,
  });
  await writeCSV(file, records);
}
