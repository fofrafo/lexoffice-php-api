import 'dotenv/config';
import { isValid, parse } from 'date-fns';

class LexOfficeClient {
  constructor() {
    this.baseUrl = 'http://localhost:3000/api';
  }

  validateDate(dateStr) {
    const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
    if (!isValid(parsed)) {
      throw new Error(`Invalid date format: ${dateStr}. Expected format: YYYY-MM-DD`);
    }
    return true;
  }

  async getVoucherlist() {
    try {
      const response = await fetch(`${this.baseUrl}/voucherlist`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed (${response.status}): ${response.statusText}\nDetails: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Request failed:', {
        error: error.message,
        type: error.name,
        details: 'Connection to proxy server failed'
      });
      throw error;
    }
  }
}

const api = new LexOfficeClient();
const TODAY = '2025-05-17';

try {
  api.validateDate(TODAY);
  
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
  console.error('Error:', {
    message: error.message,
    type: error.name,
    details: 'Failed to process voucher list request'
  });
}