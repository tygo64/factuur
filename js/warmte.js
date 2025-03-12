document.getElementById("fileInput").addEventListener("change", function(event) {
    const files = event.target.files;
    if (files.length > 0) {
        Array.from(files).forEach(file => extractPDFData(file));
    }
});

async function extractPDFData(file) {
    const fileReader = new FileReader();
    fileReader.onload = async function() {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let extractedText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            textContent.items.forEach(item => extractedText += item.str + " ");
        }

        processExtractedText(extractedText);
    };
    fileReader.readAsArrayBuffer(file);
}

function extractInvoiceAndClientNumbers(text) {
    let dataArray = text.split(/\s+/);
    let index = dataArray.indexOf("Datum");
    return {
        klantNummer: index !== -1 ? dataArray[index + 4] : "Niet gevonden",
        factuurnummer: index !== -1 ? dataArray[index + 5] : "Niet gevonden"
    };
}

function extractCompanyName(text) {
    const match = text.match(/WARMTESERVICE\s+DEN\s+BOSCH/);
    return match ? "Warmteservice Den Bosch" : "Onbekend";
}

function processExtractedText(text) {
    const dateMatch = text.match(/\b(\d{1,2}-\d{1,2}-\d{4})\b/);
    const invoiceClientData = extractInvoiceAndClientNumbers(text);
    const exclBtwMatch = text.match(/Totaal excl. btw\s*(\d+,\d{2})/);
    const btwMatch = text.match(/21 %\s*(\d+,\d{2})\s*(\d+,\d{2})/);
    const inclBtwMatch = text.match(/Totaal incl. btw\s*EUR\s*(\d+,\d{2})/);

    const factuurDatum = dateMatch ? dateMatch[1] : 'Niet gevonden';
    const bedragExclBtw = exclBtwMatch ? exclBtwMatch[1].replace(',', '.') : '0.00';
    const btwBedrag = btwMatch ? btwMatch[2].replace(',', '.') : '0.00';
    const totaalBedrag = inclBtwMatch ? inclBtwMatch[1].replace(',', '.') : 
                         (parseFloat(bedragExclBtw) + parseFloat(btwBedrag)).toFixed(2);

    const bedrijf = extractCompanyName(text);
    const factuurnummer = invoiceClientData.factuurnummer;

    if (isDuplicateInvoice(factuurnummer)) {
        document.getElementById("duplicateWarning").style.display = "block";
        return;
    } else {
        document.getElementById("duplicateWarning").style.display = "none";
        displayInvoiceData({
            bedrijf: bedrijf,
            datum: factuurDatum,
            klantnr: invoiceClientData.klantNummer,
            factuurnummer: factuurnummer,
            exclBtw: bedragExclBtw,
            btw: btwBedrag,
            inclBtw: totaalBedrag
        });
    }
}

function isDuplicateInvoice(factuurnummer) {
    const rows = document.querySelectorAll("#invoiceTable tbody tr");
    for (let row of rows) {
        if (row.cells[3].innerText === factuurnummer) {
            return true;
        }
    }
    return false;
}

function displayInvoiceData(data) {
    const tableBody = document.querySelector("#invoiceTable tbody");
    const row = `
        <tr>
            <td>${data.bedrijf}</td>
            <td>${data.datum}</td>
            <td>${data.klantnr}</td>
            <td>${data.factuurnummer}</td>
            <td>${data.exclBtw.replace('.', ',')}</td>
            <td>${data.btw.replace('.', ',')}</td>
            <td>${data.inclBtw.replace('.', ',')}</td>
        </tr>
    `;
    tableBody.innerHTML += row;
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
        
