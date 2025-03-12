// Controleer of pdf.js correct is geladen
if (typeof pdfjsLib === 'undefined') {
    console.error("pdfjsLib is niet geladen! Controleer of pdf.js correct wordt geïmporteerd in je HTML-bestand.");
}

// Event listener voor bestand upload
document.getElementById("fileInput").addEventListener("change", function(event) {
    const files = event.target.files;
    if (files.length > 0) {
        Array.from(files).forEach(file => extractPDFData(file));
    }
});

async function extractPDFData(file) {
    const fileReader = new FileReader();
    fileReader.onload = async function() {
        try {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
            let extractedText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                textContent.items.forEach(item => extractedText += item.str + " ");
            }

            console.log("Extracted Text (Technische Unie):", extractedText);
            processExtractedText(extractedText);
        } catch (error) {
            console.error("Fout bij verwerken van PDF:", error);
        }
    };
    fileReader.readAsArrayBuffer(file);
}

function processExtractedText(text) {
    // Simpele patroonherkenning voor Technische Unie facturen
    const extractedData = {
        bedrijf: "Technische Unie B.V.",
        datum: text.match(/\b(\d{1,2}-\d{1,2}-\d{4})\b/)?.[1] || "Niet gevonden",
        klantnr: text.match(/Klantnummer\s*(\d+)/)?.[1] || "Niet gevonden",
        factuurnummer: text.match(/Factuurnummer\s*(\d+)/)?.[1] || "Niet gevonden",
        exclBtw: text.match(/Totaal netto goederenwaarde\s*(\d+,\d{2})/)?.[1]?.replace(',', '.') || '0.00',
        btw: text.match(/21%\s*(\d+,\d{2})\s*(\d+,\d{2})/)?.[2]?.replace(',', '.') || '0.00',
        inclBtw: text.match(/Totaal nog te betalen\s*(\d+,\d{2})/)?.[1]?.replace(',', '.') || '0.00'
    };

    displayInvoiceData(extractedData);
}

function displayInvoiceData(data) {
    const tableBody = document.querySelector("#invoiceTable tbody");
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${data.bedrijf}</td>
        <td>${data.datum}</td>
        <td>${data.klantnr}</td>
        <td>${data.factuurnummer}</td>
        <td>${data.exclBtw.replace('.', ',')}</td>
        <td>${data.btw.replace('.', ',')}</td>
        <td>${data.inclBtw.replace('.', ',')}</td>
    `;
    tableBody.appendChild(row);
}

function exportCSV() {
    let table = document.getElementById("invoiceTable");
    let rows = table.querySelectorAll("tbody tr");

    if (rows.length === 0) {
        alert("⚠️ Geen factuurgegevens om te exporteren!");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    let headers = ["Bedrijfsnaam", "Datum", "Klantnummer", "Factuurnummer", "Totaal excl. BTW", "BTW Bedrag", "Totaal incl. BTW"];
    
    csvContent += headers.join(",") + "\n"; // Voeg kolomnamen toe

    rows.forEach(row => {
        let rowData = Array.from(row.cells).map(cell => `"${cell.innerText}"`);
        csvContent += rowData.join(",") + "\n"; // Voeg elke rij toe
    });

    // Maak een downloadbare link aan
    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "factuur_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
