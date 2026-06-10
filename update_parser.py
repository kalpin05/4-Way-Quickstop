import sys

file_path = 'src/utils/dataFetcher.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''// Simple CSV parser that reads Key-Value pairs and overrides the fallback data
function parseCSV(csvText) {
  // Start with a copy of the fallback data so missing fields are still populated
  const data = JSON.parse(JSON.stringify(fallbackData));

  // Split into rows and process
  const rows = csvText.split('\\n');
  console.log('[ParseCSV] Total rows:', rows.length);

  let parsedCount = 0;
  for (let i = 0; i < rows.length; i++) {
    const trimmedRow = rows[i].trim();
    if (!trimmedRow) continue; // Skip empty rows

    const columns = rows[i].split(',');
    if (columns.length < 2) {
      console.log([ParseCSV] Row  skipped (insufficient columns):, trimmedRow);
      continue;
    }

    let key = columns[0].trim();
    const value = columns.slice(1).join(',').trim(); // Re-join in case value had commas

    // Automatically fix common typos like "fuel.premiun" -> "fuel.premium"
    if (key === 'fuel.premiun') key = 'fuel.premium';

    if (key && key.toLowerCase() !== 'key') {
      setNestedValue(data, key, value);
      parsedCount++;
    }
  }'''

replacement = '''// Simple CSV parser that reads Key-Value pairs and overrides the fallback data
function parseCSV(csvText) {
  // Start with a copy of the fallback data so missing fields are still populated
  const data = JSON.parse(JSON.stringify(fallbackData));
  data.fuelList = [];

  // Split into rows and process
  const rows = csvText.split('\\n');
  console.log('[ParseCSV] Total rows:', rows.length);

  let parsedCount = 0;
  for (let i = 0; i < rows.length; i++) {
    const trimmedRow = rows[i].trim();
    if (!trimmedRow) continue; // Skip empty rows

    const columns = parseCSVLine(trimmedRow);
    if (columns.length < 2) {
      console.log([ParseCSV] Row  skipped (insufficient columns):, trimmedRow);
      continue;
    }

    let key = columns[0].trim();
    const value = escapeHTML(columns[1]);
    const status = columns.length > 2 ? escapeHTML(columns[2]) : "In Stock";

    // Automatically fix common typos like "fuel.premiun" -> "fuel.premium"
    if (key === 'fuel.premiun') key = 'fuel.premium';

    if (key && key.toLowerCase() !== 'key') {
      if (key.startsWith('fuel.')) {
        const type = key.split('.')[1];
        data.fuelList.push({ id: type, price: value, status: status });
      }
      setNestedValue(data, key, value);
      parsedCount++;
    }
  }'''

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced successfully')
else:
    print('Target not found')
