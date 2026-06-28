const PDFDocument = require("pdfkit");
const db = require("../db");

function generateInvoicePDF(invoice) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margins: { top: 40, bottom: 40, left: 40, right: 40 }, size: 'A4' });
      let buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });

      // Use provided transactions when available to avoid an extra DB call
      let transactions = [];
      if (invoice.transactions && Array.isArray(invoice.transactions)) {
        transactions = invoice.transactions;
      } else {
        try {
          const [payments] = await db.query(
            'SELECT payment_date, amount, notes, method FROM payments WHERE invoice_id = ? ORDER BY payment_date ASC',
            [invoice.id]
          );
          transactions = payments || [];
        } catch (err) {
          console.error("Error fetching payments:", err);
          transactions = [];
        }
      }

    // ==================== HEADER SECTION ====================
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const marginLeft = doc.page.margins.left;
    const marginRight = doc.page.margins.right;

    // Try to fetch user (admin) profile for company header info
    let adminProfile = {};
    try {
      if (invoice.user_id) {
        const [userRows] = await db.query('SELECT name, email, phone, company, address, gst_number, website FROM users WHERE id=?', [invoice.user_id]);
        if (userRows && userRows.length) adminProfile = userRows[0];
      }
    } catch (e) {
      // ignore and fall back to defaults
      adminProfile = {};
    }

    const headerHeight = 125;
    doc.rect(0, 0, pageWidth, headerHeight).fill("#1a2847");

    // Company Name / Admin company info
    const companyDisplay = adminProfile.company || 'ORBEM SOLUTIONS PRIVATE LIMITED';
    // Do not show the admin/owner name in the header subtitle — always use the business tagline
    const subtitle = 'Air Cargo Business & Freight Forwarding Logistics';

    doc.fontSize(18).font("Helvetica-Bold").fillColor("#00bcd4").text(companyDisplay, marginLeft, 18, { width: 280 });
    
    const subtitleY = doc.y + 3;
    doc.fontSize(10).font("Helvetica").fillColor("white").text(subtitle, marginLeft, subtitleY, { width: 280 });

    // Company Details
    doc.fontSize(9).font("Helvetica").fillColor("#b0bec5");
    const detailsYStart = doc.y + 6;
    if (adminProfile.gst_number) doc.text(`GSTIN: ${adminProfile.gst_number}`, marginLeft, detailsYStart); else doc.text('GSTIN: 29ORBEM9911A1Z0', marginLeft, detailsYStart);
    if (adminProfile.phone) doc.text(`Phone: ${adminProfile.phone}`, marginLeft, detailsYStart + 12); else doc.text('Phone: +91 80 4455 6677', marginLeft, detailsYStart + 12);
    const contactLine = [];
    if (adminProfile.email) contactLine.push(adminProfile.email);
    if (adminProfile.website) contactLine.push(`Web: ${adminProfile.website}`);
    if (contactLine.length) doc.text(contactLine.join(' | '), marginLeft, detailsYStart + 24);

    // INVOICE title on right - properly positioned
    doc.fontSize(36).font("Helvetica-Bold").fillColor("white").text("INVOICE", marginLeft + pageWidth / 2, 30, { width: pageWidth / 2 - marginRight, align: 'right' });

    // Reset to black
    doc.fillColor("black");

    // ==================== INVOICE DETAILS SECTION ====================
    const contentY = headerHeight + 30;

    // Left Column - Invoice Details
    doc.fontSize(12).font("Helvetica-Bold").fillColor("black").text("Invoice Details", marginLeft, contentY);

    const usableWidth = pageWidth - marginLeft - marginRight;
    const leftCol = marginLeft + 16;
    const leftValueCol = marginLeft + Math.floor(usableWidth * 0.35);
    const detailsY = contentY + 20;
    const lineHeight = 18;
    
    doc.fontSize(10).font("Helvetica").fillColor("#666").text("Invoice No.", leftCol, detailsY);
    doc.font("Helvetica-Bold").fillColor("black").text(`${invoice.invoice_number}`, leftValueCol, detailsY);
    
    doc.font("Helvetica").fillColor("#666").text("Invoice Date", leftCol, detailsY + lineHeight);
    doc.font("Helvetica-Bold").fillColor("black").text(`${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-IN') : 'N/A'}`, leftValueCol, detailsY + lineHeight);
    
    doc.font("Helvetica").fillColor("#666").text("Due Date", leftCol, detailsY + lineHeight * 2);
    const dueDateColor = invoice.is_overdue ? "#d32f2f" : "#1a2847";
    doc.font("Helvetica-Bold").fillColor(dueDateColor).text(`${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : 'N/A'}`, leftValueCol, detailsY + lineHeight * 2);
    
    doc.font("Helvetica").fillColor("#666").text("Quote Ref", leftCol, detailsY + lineHeight * 3);
    doc.font("Helvetica-Bold").fillColor("black").text("Direct Booking", leftValueCol, detailsY + lineHeight * 3);
    
    doc.font("Helvetica").fillColor("#666").text("Payment Status", leftCol, detailsY + lineHeight * 4);
    const statusColor = invoice.status === 'paid' ? '#10b981' : (invoice.status === 'partial_paid' ? '#f59e0b' : '#6b7280');
    doc.font("Helvetica-Bold").fillColor(statusColor).text(`${invoice.status.toUpperCase().replace('_', ' ')}`, leftValueCol, detailsY + lineHeight * 4);

    // Right Column - Bill To Customer
    const rightCol = marginLeft + Math.floor(usableWidth * 0.5) + 8;

    doc.fontSize(12).font("Helvetica-Bold").fillColor("black").text("Bill To Customer", rightCol, contentY);

    doc.fontSize(10).font("Helvetica").fillColor("black");
    const billY = detailsY;
    doc.font("Helvetica-Bold").text(`${invoice.customer_name || invoice.customer_name || 'N/A'}`, rightCol, billY);
    doc.font("Helvetica").fontSize(9).text(`Contact: ${invoice.customer_contact || invoice.customer_phone || 'N/A'}`, rightCol, billY + 16);
    doc.text(`Phone: ${invoice.customer_phone || invoice.customer_contact || 'N/A'}`, rightCol, billY + 28);
    doc.text(`Email: ${invoice.customer_email || 'N/A'}`, rightCol, billY + 40);
    doc.text(`GSTIN: ${invoice.customer_gstin || invoice.customer_gst || 'N/A'}`, rightCol, billY + 52);
    doc.text(`Address: ${invoice.customer_address || 'N/A'}`, rightCol, billY + 64, { width: Math.floor(usableWidth * 0.42), lineGap: 1 });

    // Separator line
    doc.moveTo(marginLeft, detailsY + 120).lineTo(pageWidth - marginRight, detailsY + 120).stroke("#d0d0d0");

    // ==================== SHIPMENT / ROUTE DETAILS BOX ====================
    const shipmentBoxY = detailsY + 132;
    const shipmentBoxHeight = 64;
    doc.roundedRect(marginLeft, shipmentBoxY, usableWidth, shipmentBoxHeight, 4).stroke("#dbeafe");
    doc.rect(marginLeft, shipmentBoxY, usableWidth, shipmentBoxHeight).fill("#f8fbff");
    doc.fillColor("#1a2847").fontSize(10).font("Helvetica-Bold").text("Shipment / Route Details", marginLeft + 10, shipmentBoxY + 8);

    doc.fillColor("black").fontSize(9).font("Helvetica");
    const routeLeftX = marginLeft + 12;
    const routeRightX = marginLeft + Math.floor(usableWidth * 0.5) + 8;
    const routeTopY = shipmentBoxY + 24;

    doc.font("Helvetica").fillColor("#666").text("Origin Airport", routeLeftX, routeTopY);
    doc.font("Helvetica-Bold").fillColor("black").text(invoice.origin || '—', routeLeftX + 86, routeTopY, { width: Math.floor(usableWidth * 0.34) });

    doc.font("Helvetica").fillColor("#666").text("Destination Airport", routeLeftX, routeTopY + 18);
    doc.font("Helvetica-Bold").fillColor("black").text(invoice.destination || '—', routeLeftX + 86, routeTopY + 18, { width: Math.floor(usableWidth * 0.34) });

    doc.font("Helvetica").fillColor("#666").text("Service Type", routeRightX, routeTopY);
    doc.font("Helvetica-Bold").fillColor("black").text(invoice.service_type || invoice.shipment_type || 'Air Cargo', routeRightX + 72, routeTopY, { width: Math.floor(usableWidth * 0.36) });

    doc.font("Helvetica").fillColor("#666").text("Weight", routeRightX, routeTopY + 18);
    doc.font("Helvetica-Bold").fillColor("black").text(invoice.weight ? `${invoice.weight} kg` : '—', routeRightX + 72, routeTopY + 18, { width: Math.floor(usableWidth * 0.36) });

    // ==================== CARGO & SHIPMENT TABLE ====================
    doc.fontSize(11).font("Helvetica-Bold").fillColor("black").text("Cargo & Shipment Details", marginLeft, shipmentBoxY + shipmentBoxHeight + 14);

    // Table headers
    const tableY = shipmentBoxY + shipmentBoxHeight + 34;
    const headerBg = "#f0f0f0";
    doc.rect(marginLeft, tableY, usableWidth, 22).fill(headerBg);
    doc.rect(marginLeft, tableY, usableWidth, 22).stroke("#d0d0d0");
    
    doc.fillColor("black").fontSize(9).font("Helvetica-Bold");
    const headerY = tableY + 6;
    const col1 = marginLeft + 8;
    const col2 = marginLeft + Math.floor(usableWidth * 0.26);
    const col3 = marginLeft + Math.floor(usableWidth * 0.46);
    const col4 = marginLeft + Math.floor(usableWidth * 0.62);
    const col5 = marginLeft + Math.floor(usableWidth * 0.77);
    const col6 = marginLeft + Math.floor(usableWidth * 0.9);

    doc.text("Cargo / Shipment Type", col1, headerY);
    doc.text("Origin", col2, headerY);
    doc.text("Destination", col3, headerY);
    doc.text("Weight (kg)", col4, headerY);
    doc.text("Rate/kg (INR)", col5, headerY);
    doc.text("Amount (INR)", col6 - 40, headerY, { align: 'right', width: pageWidth - marginRight - (col6 - 40) });

    // Parse items to dynamically generate rows
    let items = [];
    if (invoice.items) {
      try {
        items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
      } catch (e) {
        items = [];
      }
    }
    
    if (!Array.isArray(items) || items.length === 0) {
      items = [{
        description: "Air Cargo Logistics Service",
        quantity: 1,
        unit_price: parseFloat(invoice.amount) || 0
      }];
    }

    // Table data rows
    doc.fontSize(9).font("Helvetica").fillColor("black");
    let currentY = tableY + 28;
    
    items.forEach((item, idx) => {
      const desc = item.description || "Air Cargo Logistics Service";
      const qty = item.quantity || 1;
      const price = parseFloat(item.unit_price || 0);
      const amt = qty * price;
      
      doc.text(desc, col1, currentY, { width: Math.floor(usableWidth * 0.22) });
      doc.text(idx === 0 ? (invoice.origin || 'Standard Routing') : '—', col2, currentY, { width: Math.floor(usableWidth * 0.18) });
      doc.text(idx === 0 ? (invoice.destination || '—') : '—', col3, currentY, { width: Math.floor(usableWidth * 0.18) });
      doc.text(item.weight ? `${item.weight} kg` : (idx === 0 && invoice.weight ? invoice.weight.toString() : '—'), col4, currentY, { width: Math.floor(usableWidth * 0.12) });
      doc.text(`₹ ${price.toFixed(2)}`, col5, currentY, { width: Math.floor(usableWidth * 0.12) });
      doc.text(`₹ ${amt.toFixed(2)}`, col6 - 40, currentY, { align: 'right', width: pageWidth - marginRight - (col6 - 40) });
      
      doc.moveTo(marginLeft, currentY + 15).lineTo(pageWidth - marginRight, currentY + 15).stroke("#e2e8f0");
      currentY += 24;
    });

    // ==================== AMOUNT SUMMARY SECTION ====================
    const amountY = currentY + 10;
    const taxRate = parseFloat(invoice.tax_rate) || 0;
    const discount = parseFloat(invoice.discount) || 0;
    
    // Subtotal is sum of item amounts
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unit_price || 0)), 0);
    const gstAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + gstAmount - discount;
    const paidAmount = parseFloat(invoice.paid_amount) || 0;
    const balanceDue = totalAmount - paidAmount;

    // Summary Box - Right aligned
    const summaryLabelCol = marginLeft + Math.floor(usableWidth * 0.62);
    
    doc.fontSize(10).font("Helvetica");
    
    // Subtotal
    doc.fillColor("#666").text("Subtotal:", summaryLabelCol, amountY);
    doc.fillColor("black").font("Helvetica").text(`₹ ${subtotal.toFixed(2)}`, summaryLabelCol, amountY, { align: 'right', width: pageWidth - marginRight - summaryLabelCol });
    
    // GST
    doc.fillColor("#666").text(`GST (${taxRate}%):`, summaryLabelCol, amountY + 18);
    doc.fillColor("black").text(`₹ ${gstAmount.toFixed(2)}`, summaryLabelCol, amountY + 18, { align: 'right', width: pageWidth - marginRight - summaryLabelCol });
    
    // Separator line
    doc.moveTo(summaryLabelCol, amountY + 34).lineTo(pageWidth - marginRight, amountY + 34).stroke("#d0d0d0");
    
    // Total
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#1a2847");
    doc.text("Total (incl. GST):", summaryLabelCol, amountY + 42);
    doc.text(`₹ ${totalAmount.toFixed(2)}`, summaryLabelCol, amountY + 42, { align: 'right', width: pageWidth - marginRight - summaryLabelCol });
    
    // Separator line below total
    doc.moveTo(summaryLabelCol, amountY + 54).lineTo(pageWidth - marginRight, amountY + 54).stroke("#d0d0d0");
    
    // Advance Paid
    doc.font("Helvetica").fontSize(10).fillColor("#10b981");
    doc.text("Advance Paid:", summaryLabelCol, amountY + 62);
    doc.text(`- ₹ ${paidAmount.toFixed(2)}`, summaryLabelCol, amountY + 62, { align: 'right', width: pageWidth - marginRight - summaryLabelCol });
    
    // Balance Due
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#d32f2f");
    doc.text("Balance Due:", summaryLabelCol, amountY + 80);
    doc.text(`₹ ${balanceDue.toFixed(2)}`, summaryLabelCol, amountY + 80, { align: 'right', width: pageWidth - marginRight - summaryLabelCol });

    doc.fillColor("black");

    // ==================== TRANSACTION HISTORY ====================
    const txnY = amountY + 118;
    doc.fontSize(11).font("Helvetica-Bold").fillColor("black").text("Transaction History & Installments", 40, txnY);
    
    // Transaction Table headers
    const txnHeaderY = txnY + 25;
    doc.rect(marginLeft, txnHeaderY, usableWidth, 20).fill(headerBg);
    doc.rect(marginLeft, txnHeaderY, usableWidth, 20).stroke("#d0d0d0");
    
    doc.fillColor("black").fontSize(9).font("Helvetica-Bold");
    const txnHeaderTextY = txnHeaderY + 6;
    const txCol1 = marginLeft + 10;
    const txCol2 = marginLeft + Math.floor(usableWidth * 0.18);
    const txCol3 = marginLeft + Math.floor(usableWidth * 0.36);
    const txCol4 = marginLeft + Math.floor(usableWidth * 0.56);
    const txCol5 = marginLeft + Math.floor(usableWidth * 0.85);

    doc.text("Date", txCol1, txnHeaderTextY);
    doc.text("Payment Type", txCol2, txnHeaderTextY);
    doc.text("Method", txCol3, txnHeaderTextY);
    doc.text("Transaction Reference", txCol4, txnHeaderTextY);
    doc.text("Amount Received", txCol5 - 6, txnHeaderTextY, { align: 'right', width: pageWidth - marginRight - (txCol5 - 6) });

    // Transaction data rows
    doc.fontSize(9).font("Helvetica").fillColor("black");
    let txnRowY = txnHeaderY + 26;
    
    if (transactions && transactions.length > 0) {
      transactions.forEach((txn) => {
        const paymentDate = txn.payment_date ? new Date(txn.payment_date).toLocaleDateString('en-IN') : 'N/A';
        const paymentType = txn.notes ? txn.notes.substring(0, 20) : 'Online';
        const method = txn.method || 'Bank Transfer';
        const refNo = txn.notes ? txn.notes.substring(0, 30) : 'AUTO';

        doc.text(paymentDate, txCol1, txnRowY);
        doc.text(paymentType, txCol2, txnRowY);
        doc.text(method, txCol3, txnRowY);
        doc.text(refNo, txCol4, txnRowY, { width: Math.floor(usableWidth * 0.28) });
        doc.text(`₹ ${parseFloat(txn.amount).toFixed(2)}`, txCol5 - 6, txnRowY, { align: 'right', width: pageWidth - marginRight - (txCol5 - 6) });

        txnRowY += 18;
      });
    } else {
      doc.fontSize(9).font("Helvetica").fillColor("#999");
      doc.text("No transaction history recorded yet.", 50, txnRowY);
    }

    // ==================== FOOTER ====================
    const footerY = pageHeight - doc.page.margins.bottom - 40;
    doc.moveTo(marginLeft, footerY).lineTo(pageWidth - marginRight, footerY).stroke("#1a2847");

    doc.fontSize(9).fillColor("#666");
    doc.text("Thank you for choosing ORBEM Solutions Pvt. Ltd.", marginLeft, footerY + 12, { align: 'center', width: usableWidth });
    doc.fontSize(8).text("This is an automatically generated invoice. For queries, contact billing@orbemsolutions.com", marginLeft, footerY + 24, { align: 'center', width: usableWidth });

    doc.end();
    } catch (err) {
      console.error("Error generating PDF:", err);
      reject(err);
    }
  });
}

module.exports = generateInvoicePDF;