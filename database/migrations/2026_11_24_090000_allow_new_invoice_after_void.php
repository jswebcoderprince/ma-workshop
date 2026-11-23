<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A voided invoice stays on record with its number, and the job can get a new invoice with the next number.
 * So a job can have several invoices, of which at most one is not voided (checked in InvoiceController).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // The foreign key needs an index on work_order_id; add the plain one before dropping the unique one.
            $table->index('work_order_id', 'invoices_work_order_id_index');
            $table->dropUnique(['work_order_id']);
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->unique('work_order_id');
            $table->dropIndex('invoices_work_order_id_index');
        });
    }
};
