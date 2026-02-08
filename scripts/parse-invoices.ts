import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse.js';

interface InvoiceLineItem {
  invoice_number: string;
  invoice_date: string;
  customer_id: string;
  customer_name: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_of_issue: string;
  unit_price: number;
  vat: number;
  total: number;
}

async function parseInvoicePDF(filePath: string): Promise<InvoiceLineItem[]> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  const text = data.text;

  const lineItems: InvoiceLineItem[] = [];

  // Extract invoice number
  const invoiceMatch = text.match(/INV-(\d+)/);
  const invoiceNumber = invoiceMatch ? `INV-${invoiceMatch[1]}` : '';

  // Extract date - format: DD/MM/YY
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{2})/);
  const invoiceDate = dateMatch ? dateMatch[1] : '';

  // Extract customer ID
  const customerIdMatch = text.match(/C(\d+)/);
  const customerId = customerIdMatch ? `C${customerIdMatch[1]}` : '';

  // Customer name is always TASTE PIZZA (WHITBURN)
  const customerName = 'TASTE PIZZA (WHITBURN)';

  // Split text into lines
  const lines = text.split('\n');

  // Parse product lines - looking for pattern: CODE DESCRIPTION QTY UOI PRICE VAT TOTAL
  // Product codes start with letter followed by numbers (e.g., G0005, C0002, F3205, B01001)
  for (const line of lines) {
    // Match product lines with format: CODE DESCRIPTION QTY UOI PRICE VAT TOTAL
    // Examples from PDF:
    // G0005 KTC RAPESEED OIL 20LTR 1 BOX 25.99 .00 25.99
    // C0002 Izzimo 70/30 Mozz Ched (Grated) 6x1.8kg 3 CASE 44.99 .00 44.99

    // Pattern: Code at start, then description, then numbers at end
    const productMatch = line.match(/^([A-Z]\d{3,5})\s+(.+?)\s+(\d+)\s+(BOX|CASE|PACK|BOTTLE|BAG|EACH|TUB|BUCKET|CTN|CARTON|KG|LTR|LITRE)\s+([\d.]+)\s+[.]?(\d{2})\s+([\d.]+)/i);

    if (productMatch) {
      const [, code, description, qty, uoi, price, vat, total] = productMatch;

      lineItems.push({
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        customer_id: customerId,
        customer_name: customerName,
        product_code: code.trim(),
        product_name: description.trim(),
        quantity: parseInt(qty, 10),
        unit_of_issue: uoi.trim(),
        unit_price: parseFloat(price),
        vat: parseFloat(`0.${vat}`),
        total: parseFloat(total)
      });
    }
  }

  // If the simple pattern didn't work, try parsing the table structure differently
  if (lineItems.length === 0) {
    // Try alternative parsing for table format
    // Look for lines that start with a product code
    const productCodePattern = /^([A-Z]\d{3,5})/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const codeMatch = line.match(productCodePattern);

      if (codeMatch) {
        // Extract all numbers from the line
        const numbers = line.match(/[\d.]+/g);

        if (numbers && numbers.length >= 4) {
          // Last 3 numbers are typically: price, vat, total
          const total = parseFloat(numbers[numbers.length - 1]);
          const vat = parseFloat(numbers[numbers.length - 2]);
          const price = parseFloat(numbers[numbers.length - 3]);
          const qty = parseInt(numbers[numbers.length - 4], 10);

          // Extract description (everything between code and first number after code)
          const codeEndIndex = line.indexOf(codeMatch[1]) + codeMatch[1].length;
          const restOfLine = line.substring(codeEndIndex).trim();

          // Find UOI patterns
          const uoiMatch = restOfLine.match(/(BOX|CASE|PACK|BOTTLE|BAG|EACH|TUB|BUCKET|CTN|CARTON|KG|LTR|LITRE)/i);
          const uoi = uoiMatch ? uoiMatch[1] : 'EACH';

          // Description is everything before the quantity
          const descMatch = restOfLine.match(/^(.+?)\s+\d+/);
          const description = descMatch ? descMatch[1].replace(/\s+\d+.*$/, '').trim() : restOfLine.split(/\s+\d/)[0].trim();

          if (description && qty > 0 && total > 0) {
            lineItems.push({
              invoice_number: invoiceNumber,
              invoice_date: invoiceDate,
              customer_id: customerId,
              customer_name: customerName,
              product_code: codeMatch[1],
              product_name: description,
              quantity: qty,
              unit_of_issue: uoi,
              unit_price: price,
              vat: vat,
              total: total
            });
          }
        }
      }
    }
  }

  return lineItems;
}

async function parseAllInvoices(invoicesDir: string, outputPath: string): Promise<void> {
  const files = fs.readdirSync(invoicesDir).filter(f => f.endsWith('.pdf'));

  console.log(`Found ${files.length} PDF files to process`);

  const allLineItems: InvoiceLineItem[] = [];
  let processedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const filePath = path.join(invoicesDir, file);
    try {
      const items = await parseInvoicePDF(filePath);
      allLineItems.push(...items);
      processedCount++;

      if (items.length > 0) {
        console.log(`✓ ${file}: ${items.length} items`);
      } else {
        console.log(`⚠ ${file}: No items found`);
      }
    } catch (error) {
      errorCount++;
      console.error(`✗ Error processing ${file}:`, error);
    }
  }

  // Generate CSV
  const headers = [
    'invoice_number',
    'invoice_date',
    'customer_id',
    'customer_name',
    'product_code',
    'product_name',
    'quantity',
    'unit_of_issue',
    'unit_price',
    'vat',
    'total'
  ];

  const csvRows = [headers.join(',')];

  for (const item of allLineItems) {
    const row = [
      item.invoice_number,
      item.invoice_date,
      item.customer_id,
      `"${item.customer_name}"`,
      item.product_code,
      `"${item.product_name}"`,
      item.quantity.toString(),
      item.unit_of_issue,
      item.unit_price.toFixed(2),
      item.vat.toFixed(2),
      item.total.toFixed(2)
    ];
    csvRows.push(row.join(','));
  }

  fs.writeFileSync(outputPath, csvRows.join('\n'));

  console.log('\n========== SUMMARY ==========');
  console.log(`Total invoices processed: ${processedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total line items: ${allLineItems.length}`);
  console.log(`Output saved to: ${outputPath}`);

  // Show sample of data
  if (allLineItems.length > 0) {
    console.log('\n========== SAMPLE DATA ==========');
    const uniqueInvoices = [...new Set(allLineItems.map(i => i.invoice_number))];
    console.log(`Unique invoices: ${uniqueInvoices.length}`);
    console.log('\nFirst 5 line items:');
    allLineItems.slice(0, 5).forEach(item => {
      console.log(`  ${item.invoice_number} | ${item.invoice_date} | ${item.product_code} | ${item.product_name} | Qty: ${item.quantity} | £${item.total}`);
    });
  }
}

// Main execution
const invoicesDir = '/Users/rosireddykoppula/Documents/invoices';
const outputPath = '/Users/rosireddykoppula/projects/churn-detection-review/sample_data/fresco_invoices.csv';

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

parseAllInvoices(invoicesDir, outputPath)
  .then(() => console.log('\nDone!'))
  .catch(err => console.error('Fatal error:', err));
