import 'dotenv/config';
import fetch from 'node-fetch';

class LexOfficeClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.lexoffice.io/v1';
  }

  async getVoucherlist({ types = ['invoice'], sortDirection = 'DESC', sortColumn = 'voucherDate' }) {
    const url = new URL(`${this.baseUrl}/voucherlist`);
    url.searchParams.append('page', '0');
    url.searchParams.append('size', '100');
    url.searchParams.append('sort', `${sortColumn},${sortDirection}`);
    url.searchParams.append('voucherType', types.join(','));

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Get yesterday's date in YYYY-MM-DD format
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0];

const api = new LexOfficeClient(process.env.LEX_OFFICE_API_KEY);

try {
  const result = await api.getVoucherlist({
    types: ['invoice'],
    sortDirection: 'DESC',
    sortColumn: 'voucherDate'
  });

  const yesterdaysInvoices = result.content.filter(invoice => 
    invoice.voucherDate.startsWith(yesterdayStr)
  );

  console.log(`Invoices from ${yesterdayStr}:\n`);
  yesterdaysInvoices.forEach(invoice => {
    console.log(`Invoice Number: ${invoice.voucherNumber}`);
    console.log(`Amount: ${invoice.totalAmount} ${invoice.currency}`);
    console.log(`Status: ${invoice.voucherStatus}`);
    console.log('------------------------');
  });

} catch (error) {
  console.error('Error:', error.message);
}