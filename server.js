import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import fetch from 'node-fetch';
import { backOff } from 'exponential-backoff';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

async function fetchFromLexOffice(url, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
      throw new Error('Request timeout after 30 seconds');
    }
    throw error;
  }
}

app.get('/api/voucherlist', async (req, res) => {
  const baseUrl = 'https://api.lexoffice.io/v1/voucherlist';
  const url = new URL(baseUrl);
  
  url.searchParams.append('page', '0');
  url.searchParams.append('size', '25');
  url.searchParams.append('sort', 'voucherDate,DESC');
  url.searchParams.append('voucherType', 'invoice');
  url.searchParams.append('voucherStatus', 'open,paid,paidoff,voided');

  try {
    const result = await backOff(() => fetchFromLexOffice(url.toString(), process.env.LEX_OFFICE_API_KEY), {
      numOfAttempts: 10,
      startingDelay: 2000,
      maxDelay: 60000,
      timeMultiple: 2,
      retry: (error) => {
        console.log(`Retry attempt due to error: ${error.message}`);
        return error.message.includes('socket hang up') || 
               error.message.includes('ECONNRESET') ||
               error.message.includes('ETIMEDOUT') ||
               error.code === 'ECONNREFUSED' ||
               error.code === 'ENOTFOUND';
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Request failed:', {
      url: url.toString(),
      error: error.message,
      type: error.name
    });
    res.status(500).json({
      error: error.message,
      type: error.name,
      details: 'Failed to fetch data from LexOffice API'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});