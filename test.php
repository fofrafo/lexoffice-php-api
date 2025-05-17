<?php

require __DIR__ . '/vendor/autoload.php';

$apiKey = getenv('LEX_OFFICE_API_KEY');
$api = new \Exbil\LexOffice\LexOfficeClient($apiKey);

// Set up the voucherlist client with filters
$client = $api->voucherlist();
$client->types = ['invoice']; // Only get invoices
$client->sortDirection = 'DESC';
$client->sortColumn = 'voucherDate';
$client->statuses = ['open', 'paid', 'paidoff', 'voided']; // Include all relevant statuses

// Get today's date in the format YYYY-MM-DD
$today = '2025-05-17';

try {
    // Fetch all invoices
    $response = $client->getAll();
    $result = $client->getAsJson($response);
    
    // Filter for today's invoices
    $todaysInvoices = array_filter($result->content, function($invoice) use ($today) {
        return strpos($invoice->voucherDate, $today) === 0;
    });
    
    echo "Invoices from " . $today . ":\n\n";
    foreach ($todaysInvoices as $invoice) {
        echo "Invoice Number: " . $invoice->voucherNumber . "\n";
        echo "Amount: " . $invoice->totalAmount . " " . $invoice->currency . "\n";
        echo "Status: " . $invoice->voucherStatus . "\n";
        echo "------------------------\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}