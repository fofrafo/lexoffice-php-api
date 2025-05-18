import 'dotenv/config';
import fetch from 'node-fetch';
import { backOff } from 'exponential-backoff';
import { isValid, parse } from 'date-fns';

class LexOfficeClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.lexoffice.io/v1';
  }

  validateDate(dateStr) {
    const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
    if (!isValid(parsed)) {
      throw new Error(`Invalid date format: ${dateStr}. Expected format: YYYY-MM-DD`);
    }
    return true;
  }

  async getVoucherlist() {
    const url = new URL(`${this.baseUrl}/voucherlist`);
    
    // Reduce page size to minimize data transfer
    url.searchParams.append('page', '0');
    url.searchParams.append('size', '25');
    url.searchParams.append('sort', 'voucherDate,DESC');
    url.searchParams.append('voucherType', 'invoice');
    url.searchParams.append('voucherStatus', 'open,paid,paidoff,voided');

    const fetchWithRetry = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed (${response.status}): ${response.statusText}\nDetails: ${errorText}`);
        }

        return response.json();
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after 30 seconds: ${url.toString()}`);
        }
        throw error;
      }
    };

    try {
      // Implement retry logic with exponential backoff
      return await backOff(() => fetchWithRetry(), {
        numOfAttempts: 10,
        startingDelay: 2000,
        maxDelay: 60000,
        timeMultiple: 2,
        retry: (error) => {
          console.log(`Retry attempt due to error: ${error.message}`);
          // Enhanced error checking for network-related issues
          const shouldRetry = error.message.includes('socket hang up') || 
                            error.message.includes('ECONNRESET') ||
                            error.message.includes('ETIMEDOUT') ||
                            error.code === 'ECONNREFUSED' ||
                            error.code === 'ENOTFOUND';
          if (shouldRetry) {
            console.log('Network-related error detected, attempting retry...');
          }
          return shouldRetry;
        }
      });
    } catch (error) {
      console.error('Request failed:', {
        url: url.toString(),
        error: error.message,
        type: error.name,
        details: 'Connection to lexoffice API failed'
      });
      throw error;
    }
  }
}

const api = new LexOfficeClient(process.env.LEX_OFFICE_API_KEY);
const TODAY = '2025-05-17';

try {
  // Validate date format before making the request
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