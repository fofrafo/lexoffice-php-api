<?php

require __DIR__ . '/vendor/autoload.php';

$apiKey = getenv('LEX_OFFICE_API_KEY');
$api = new \Exbil\LexOffice\LexOfficeClient($apiKey);

// Set up the voucherlist client with filters
$client = $api->voucherlist();
$client->types = ['invoice']; // Only get invoices
$client->sortDirection = 'DESC';
$client->sortColumn = 'voucherDate';

// Get yesterday's date in the format YYYY-MM-DD
$yesterday = date('Y-m-d', strtotime('-1 day'));

try {
    // Fetch all invoices
    $response = $client->getAll();
    $result = $client->getAsJson($response);
    
    // Filter for yesterday's invoices
    $yesterdaysInvoices = array_filter($result->content, function($invoice) use ($yesterday) {
        return strpos($invoice->voucherDate, $yesterday) === 0;
    });
    
    echo "Invoices from " . $yesterday . ":\n\n";
    foreach ($yesterdaysInvoices as $invoice) {
        echo "Invoice Number: " . $invoice->voucherNumber . "\n";
        echo "Amount: " . $invoice->totalAmount . " " . $invoice->currency . "\n";
        echo "Status: " . $invoice->voucherStatus . "\n";
        echo "------------------------\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}