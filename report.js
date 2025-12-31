/**
 * Report Generation Script
 * Handles export of event details to PDF and Excel.
 */

// Function to generate unique ID for reports
function generateReportId() {
    return 'RPT-' + Date.now().toString(36).toUpperCase();
}

// Function to format current date and time
function getCurrentDateTime() {
    const now = new Date();
    return now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Function to export to PDF
async function exportToPDF() {
    if (window.Utils) Utils.showToast("🔄 جاري إنشاء ملف PDF...");
    else alert("Generating PDF...");

    // Get headers from modal
    const title = document.getElementById('modalTitle').textContent || "Unknown Event";
    const description = document.getElementById('modalDescription').textContent || "No description provided.";
    const reportId = generateReportId();
    const dateTime = getCurrentDateTime();

    // Capture Map Screenshot
    let mapImage = null;
    if (window.getMapScreenshot) {
        try {
            mapImage = await window.getMapScreenshot();
        } catch (e) {
            console.warn("Could not capture map screenshot:", e);
        }
    }

    // Analytics Data Extraction
    const totalEvents = document.getElementById('totalCountVal')?.innerText || "N/A";
    const maxMag = document.getElementById('maxMagVal')?.innerText || "N/A";
    const riskScore = document.getElementById('riskScoreVal')?.innerText || "N/A";
    const impactText = document.getElementById('impactText')?.innerText.replace(/\n/g, " ") || "N/A";

    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- Design & Layout ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Header (Logo/Title) - Blue Background
    doc.setFillColor(0, 31, 63); // #001f3f
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("EARTH GUARD - INTELLIGENCE REPORT", pageWidth / 2, 25, { align: "center" });

    yPos = 55;

    // Metadata Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text(`Report ID: ${reportId}`, margin, yPos);
    doc.text(`Generated: ${dateTime}`, pageWidth - margin, yPos, { align: "right" });
    yPos += 15;

    // Analytic Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 35, 'FD');

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 31, 63);
    doc.text("SESSION STATISTICS", margin + 5, yPos + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Total Events Filtered: ${totalEvents}`, margin + 5, yPos + 20);
    doc.text(`Max Magnitude: ${maxMag}`, margin + 5, yPos + 27);
    doc.text(`Risk Score: ${riskScore}/100`, margin + 60, yPos + 20);

    // Impact Text
    doc.setFontSize(9);
    doc.setTextColor(100, 0, 0);
    const splitImpact = doc.splitTextToSize(`IMPACT ANALYSIS: ${impactText}`, pageWidth - (margin * 2) - 10);
    doc.text(splitImpact, margin + 5, yPos + 27 + (splitImpact.length * 4)); // Adjust below max mag

    yPos += 50;

    // Event Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 31, 63);
    doc.text(title, margin, yPos);
    yPos += 10;

    // Event Description
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const splitDesc = doc.splitTextToSize(description, pageWidth - (margin * 2));
    doc.text(splitDesc, margin, yPos);
    yPos += (splitDesc.length * 7) + 15;

    // Map Snapshot Section
    if (mapImage) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 31, 63);
        doc.text("Live Satellite View", margin, yPos);
        yPos += 8;

        // Add Image
        // Aspect ratio of standard 800x600 canvas approx
        const imgWidth = 160;
        const imgHeight = 90;

        // Check page break
        if (yPos + imgHeight > 280) {
            doc.addPage();
            yPos = 20;
        }

        // Center image
        const xImg = (pageWidth - imgWidth) / 2;

        doc.addImage(mapImage, 'PNG', xImg, yPos, imgWidth, imgHeight);

        // Add border to image
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(xImg, yPos, imgWidth, imgHeight);

        yPos += imgHeight + 10;
    }

    // Signature / Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("This report is automatically generated by EarthGuard Intelligence System.", pageWidth / 2, 280, { align: "center" });

    // Save
    doc.save(`EarthGuard_Report_${title.replace(/\s+/g, '_')}.pdf`);
    alert("✅ تم تحميل ملف PDF بنجاح!");
}

// Function to export to Excel
function exportToExcel() {
    alert("🔄 جاري إنشاء ملف Excel...");

    const title = document.getElementById('modalTitle').textContent || "Unknown Event";
    const description = document.getElementById('modalDescription').textContent || "No description provided.";
    const reportId = generateReportId();
    const dateTime = getCurrentDateTime();

    // Data to export
    const data = [
        ["Earth Sky - Detailed Event Report"],
        [""],
        ["Report ID", reportId],
        ["Date & Time", dateTime],
        [""],
        ["Event Name", title],
        ["Description", description],
        [""],
        ["Note", "Refer to the PDF version for visual map snapshots."]
    ];

    // Create Worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Styling (Basic - adjust width)
    const wscols = [
        { wch: 20 }, // Column A width
        { wch: 50 }, // Column B width
    ];
    ws['!cols'] = wscols;

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Event Report");

    // Save
    XLSX.writeFile(wb, `EarthSky_Data_${title.replace(/\s+/g, '_')}.xlsx`);
    alert("✅ تم تحميل ملف Excel بنجاح!");
}

// Function to export Image (Map Snapshot)
function exportToImage() {
    alert("🔄 جاري التقاط صورة الخريطة...");

    const title = document.getElementById('modalTitle').textContent || "Event";

    // Check if map or globe is active
    let dataUrl = null;
    if (window.getMapScreenshot) {
        try {
            dataUrl = window.getMapScreenshot();
        } catch (e) {
            console.error("Screenshot failed", e);
            alert("❌ فشل التقاط الصورة: " + e.message);
            return;
        }
    }

    if (dataUrl) {
        const link = document.createElement('a');
        link.download = `EarthSky_Map_${title.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert("✅ تم تحميل صورة الخريطة بنجاح!");
    } else {
        alert("❌ لا يمكن التقاط صورة الخريطة");
    }
}

// Expose functions globally for button onClick
window.exportToPDF = exportToPDF;
window.exportToExcel = exportToExcel;
window.exportToImage = exportToImage;
