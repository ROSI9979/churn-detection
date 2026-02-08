const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');

function parseInvoicePDF(filePath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', errData => {
      reject(errData.parserError);
    });

    pdfParser.on('pdfParser_dataReady', pdfData => {
      try {
        const lineItems = [];

        // Get all text from the PDF
        let fullText = '';
        const textItems = [];

        if (pdfData.Pages) {
          for (const page of pdfData.Pages) {
            if (page.Texts) {
              for (const text of page.Texts) {
                if (text.R) {
                  for (const r of text.R) {
                    const decodedText = decodeURIComponent(r.T);
                    fullText += decodedText + ' ';
                    textItems.push({
                      text: decodedText,
                      x: text.x,
                      y: text.y
                    });
                  }
                }
              }
            }
          }
        }

        // Extract invoice number
        const invoiceMatch = fullText.match(/INV-(\d+)/);
        const invoiceNumber = invoiceMatch ? `INV-${invoiceMatch[1]}` : '';

        // Extract date - format: DD/MM/YY and convert to YYYY-MM-DD
        const dateMatch = fullText.match(/(\d{2})\/(\d{2})\/(\d{2})/);
        let invoiceDate = '';
        if (dateMatch) {
          const day = dateMatch[1];
          const month = dateMatch[2];
          const year = dateMatch[3];
          // Convert 2-digit year to 4-digit (24 -> 2024, 25 -> 2025, 26 -> 2026)
          const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
          invoiceDate = `${fullYear}-${month}-${day}`;
        }

        // Extract customer ID
        const customerIdMatch = fullText.match(/C(\d{4,5})/);
        const customerId = customerIdMatch ? `C${customerIdMatch[1]}` : '';

        // Customer name
        const customerName = 'TASTE PIZZA (WHITBURN)';

        // Group text items by Y position (rows)
        const rows = {};
        for (const item of textItems) {
          const y = Math.round(item.y * 10) / 10; // Round to 1 decimal
          if (!rows[y]) rows[y] = [];
          rows[y].push(item);
        }

        // Sort rows by Y position
        const sortedYs = Object.keys(rows).map(Number).sort((a, b) => a - b);

        // Track seen products to avoid duplicates
        const seenProducts = new Set();

        // Parse each row looking for product lines
        // Looking for format: CODE DESCRIPTION QTY UOI PRICE VAT TOTAL
        for (const y of sortedYs) {
          const row = rows[y].sort((a, b) => a.x - b.x);
          const rowText = row.map(r => r.text).join(' ');

          // Look for product code at start of row
          const codeMatch = rowText.match(/^([A-Z]\d{3,5})\s+/);
          if (codeMatch) {
            const code = codeMatch[1];

            // Skip if looks like header row
            if (rowText.includes('Product Description') || rowText.includes('Code')) continue;
            // Skip account info row
            if (rowText.includes('TAMILMANI') || rowText.includes('Account')) continue;

            // Parse the row more carefully
            // Format: CODE DESCRIPTION QTY UOI PRICE VAT TOTAL
            // Example: G0005 KTC RAPESEED OIL 20LTR 1 BOX 25.99 .00 25.99

            // Find UOI to help split the row
            const uoiMatch = rowText.match(/\s(\d+)\s+(BOX|CASE|PACK|BOTTLE|BAG|EACH|TUB|BUCKET|CTN|CARTON|KG|LTR|LITRE|BALL|SLEEVE|ROLL|JAR|TIN|SACHET|BTL|TRAY)\s+/i);

            if (uoiMatch) {
              const qty = parseInt(uoiMatch[1], 10);
              const uoi = uoiMatch[2].toUpperCase();

              // Get the part after UOI for prices
              const afterUOI = rowText.substring(rowText.indexOf(uoiMatch[0]) + uoiMatch[0].length);
              const priceNumbers = afterUOI.match(/(\d+\.?\d*)/g) || [];

              if (priceNumbers.length >= 3) {
                const unitPrice = parseFloat(priceNumbers[0]);
                const vat = parseFloat(priceNumbers[1]);
                const total = parseFloat(priceNumbers[2]);

                // Get description - between code and quantity
                const beforeQty = rowText.substring(0, rowText.indexOf(uoiMatch[0]));
                let description = beforeQty.substring(code.length).trim();

                const key = `${invoiceNumber}-${code}-${qty}-${total}`;

                if (description && qty > 0 && qty < 500 && total > 0 && !seenProducts.has(key)) {
                  seenProducts.add(key);
                  lineItems.push({
                    invoice_number: invoiceNumber,
                    invoice_date: invoiceDate,
                    customer_id: customerId,
                    customer_name: customerName,
                    product_code: code,
                    product_name: description,
                    quantity: qty,
                    unit_of_issue: uoi,
                    unit_price: unitPrice,
                    vat: vat,
                    total: total
                  });
                }
              }
            }
          }
        }

        resolve(lineItems);
      } catch (error) {
        reject(error);
      }
    });

    pdfParser.loadPDF(filePath);
  });
}

async function parseAllInvoices(invoicesDir, outputPath) {
  const files = fs.readdirSync(invoicesDir).filter(f => f.endsWith('.pdf'));

  console.log(`Found ${files.length} PDF files to process\n`);

  const allLineItems = [];
  let processedCount = 0;
  let errorCount = 0;
  let emptyCount = 0;

  for (const file of files) {
    const filePath = path.join(invoicesDir, file);
    try {
      const items = await parseInvoicePDF(filePath);
      allLineItems.push(...items);
      processedCount++;

      if (items.length > 0) {
        console.log(`✓ ${file}: ${items.length} items`);
      } else {
        emptyCount++;
        console.log(`⚠ ${file}: No items found`);
      }
    } catch (error) {
      errorCount++;
      console.error(`✗ Error processing ${file}:`, error.message || error);
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
      `"${item.product_name.replace(/"/g, '""')}"`,
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
  console.log(`Invoices with no items: ${emptyCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total line items: ${allLineItems.length}`);
  console.log(`Output saved to: ${outputPath}`);

  // Show sample of data
  if (allLineItems.length > 0) {
    console.log('\n========== SAMPLE DATA ==========');
    const uniqueInvoices = [...new Set(allLineItems.map(i => i.invoice_number))];
    console.log(`Unique invoices: ${uniqueInvoices.length}`);

    // Date range
    const dates = allLineItems.map(i => i.invoice_date).filter(d => d);
    if (dates.length > 0) {
      console.log(`Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
    }

    // Unique products
    const uniqueProducts = [...new Set(allLineItems.map(i => i.product_code))];
    console.log(`Unique products: ${uniqueProducts.length}`);

    console.log('\nFirst 10 line items:');
    allLineItems.slice(0, 10).forEach(item => {
      console.log(`  ${item.invoice_number} | ${item.invoice_date} | ${item.product_code} | ${item.product_name.substring(0, 35).padEnd(35)} | Qty: ${item.quantity.toString().padStart(2)} | £${item.total.toFixed(2)}`);
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
