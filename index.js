import 'dotenv/config';
import fetch from 'node-fetch';

class LexOfficeClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.lexoffice.io/v1';
  }

  async getVoucherlist() {
    const url = new URL(`${this.baseUrl}/voucherlist`);
    
    // Set parameters for today's invoices
    url.searchParams.append('page', '0');
    url.searchParams.append('size', '100');
    url.searchParams.append('sort', 'voucherDate,DESC');
    url.searchParams.append('voucherType', 'invoice');
    url.searchParams.append('voucherStatus', 'open,paid,paidoff,voided');

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed (${response.status}): ${response.statusText}\nDetails: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Request URL:', url.toString());
      console.error('Request Headers:', {
        'Authorization': 'Bearer [HIDDEN]',
        'Accept': 'application/json'
      });
      throw error;
    }
  }
}

const api = new LexOfficeClient(process.env.LEX_OFFICE_API_KEY);
const TODAY = '2025-05-17';

try {
  console.log('Fetching voucher list...');
  const result = await api.getVoucherlist();
  
  if (result.content && Array.isArray(result.content)) {
    const todaysInvoices = result.content.filter(invoice => 
      invoice.voucherDate.startsWith(TODAY)
    );

    console.log(`Invoices from ${TODAY}:\n`);
    todaysInvoices.forEach(invoice => {
      console.log(`Invoice Number: ${invoice.voucherNumber}`);
      console.log(`Date: ${invoice.voucherDate}`);
      console.log(`Amount: ${invoice.totalAmount} ${invoice.currency}`);
      console.log(`Status: ${invoice.voucherStatus}`);
      console.log('------------------------');
    });

    if (todaysInvoices.length === 0) {
      console.log('No invoices found for today.');
    }
  } else {
    console.log('No invoices found or unexpected response format:', result);
  }
} catch (error) {
  console.error('Error:', error.message);
}