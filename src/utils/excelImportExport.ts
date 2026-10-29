import * as XLSX from 'xlsx';

/**
 * Utility functions for exporting and importing Excel (.xlsx) and CSV files
 * across Crane, Scaffolding, and Turnover modules.
 */

export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
) {
  try {
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-fit column widths
    const colWidths = headers.map((h, colIdx) => {
      let maxLen = h.length;
      rows.forEach(row => {
        const val = row[colIdx];
        if (val !== undefined && val !== null) {
          const str = String(val);
          if (str.length > maxLen) maxLen = str.length;
        }
      });
      return { wch: Math.min(Math.max(maxLen + 4, 12), 50) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

    const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, fullFilename);
  } catch (error) {
    console.error('Failed to export Excel file:', error);
    // Fallback to CSV
    exportToCsv(filename, headers, rows);
  }
}

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
) {
  const escapeCsv = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCsv).join(',');
  const rowLines = rows.map(r => r.map(escapeCsv).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fullFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', fullFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function parseExcelOrCsvFile(file: File): Promise<string[][]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawAoa = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
          const cleaned = rawAoa
            .filter((row: any) => Array.isArray(row) && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''))
            .map((row: any) => row.map((cell: any) => (cell !== undefined && cell !== null ? String(cell).trim() : '')));
          resolve(cleaned);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  // Fallback to text reading (CSV/TSV)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve(parseDelimitedText(text));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file, 'UTF-8');
  });
}

export function parseDelimitedText(text: string): string[][] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result: string[][] = [];

  for (const line of lines) {
    let cells: string[] = [];
    if (line.includes('\t')) {
      cells = line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
    } else if (line.includes(',')) {
      // Basic CSV split considering quotes
      const match = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
      if (match) {
        cells = match.map(c => c.replace(/^,/, '').trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      } else {
        cells = line.split(',').map(c => c.trim());
      }
    } else if (line.includes(';')) {
      cells = line.split(';').map(c => c.trim());
    } else {
      cells = line.split(/\s{2,}/).map(c => c.trim());
    }
    if (cells.length > 0) {
      result.push(cells);
    }
  }

  return result;
}
