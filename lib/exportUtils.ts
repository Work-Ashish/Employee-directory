import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportToCSV = (data: any[], filename: string) => {
    if (!data || !data.length) return;

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const val = row[header] ? row[header].toString().replace(/,/g, '') : '';
            return val;
        }).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const exportToPDF = (headers: string[], data: any[], filename: string, title: string = 'Report') => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    autoTable(doc, {
        head: [headers],
        body: data,
        startY: 36,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 122, 255] }
    });

    doc.save(`${filename}.pdf`);
}
