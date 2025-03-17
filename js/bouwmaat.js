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

            console.log("Extracted Text (Bouwmaat):", extractedText);
            processExtractedText(extractedText);
        } catch (error) {
            console.error("Fout bij verwerken van PDF:", error);
        }
    };
    fileReader.readAsArrayBuffer(file);
}

function processExtractedText(text) {
    // Fix gesplitste woorden (elimineer dubbele spaties en rare afbrekingen)
    text = text.replace(/\s{2,}/g, " ").trim();

    console.log("Gecorrigeerde tekst:", text); // Debug

    // Zoek de rij met BTW-bedragen en split op spaties
    const prijzenRijMatch = text.match(/Goederen ex\. BTW laag Goederen ex\. 0% BTW Goederen ex\. BTW hoog BTW laag BTW hoog Totaal bedrag factuur\s*([\d,\. ]+)/);
    
    let bedragen = [];
    if (prijzenRijMatch) {
        bedragen = prijzenRijMatch[1].trim().split(/\s+/);
    }

    // Vaste posities:
    const totaalExclBtw = bedragen.length >= 4 ? bedragen[3].replace(',', '.') : '0.00';  // 12,52 (Goederen ex. BTW hoog)
    const btwBedrag = bedragen.length >= 2 ? bedragen[1].replace(',', '.') : '0.00';      // 2,63 (BTW hoog)
    const totaalInclBtw = (parseFloat(totaalExclBtw) + parseFloat(btwBedrag)).toFixed(2);

    // Zoek overige factuurgegevens
    const factuurDatumMatch = text.match(/Factuurdatum:\s*(\d{2}-\d{2}-\d{4})/);
    const debiteurnrMatch = text.match(/Debiteurnr\.\s*(\d+)/);

    // Factuurnummer ophalen op basis van positie in de tekst
    const factuurnummerMatch = text.match(/Factuurdatum:\s*\d{2}-\d{2}-\d{4}.*?(\d{6,})/);

    const extractedData = {
        bedrijf: "Bouwmaat Den Bosch",
        datum: factuurDatumMatch ? factuurDatumMatch[1] : "Niet gevonden",
        klantnr: debiteurnrMatch ? debiteurnrMatch[1] : "Niet gevonden",
        factuurnummer: factuurnummerMatch ? factuurnummerMatch[1] : "Niet gevonden",
        exclBtw: totaalExclBtw,
        btw: btwBedrag,
        inclBtw: totaalInclBtw
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
