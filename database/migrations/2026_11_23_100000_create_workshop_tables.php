<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mechanics', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->json('vehicle_types');
            $table->json('work_days');
            $table->string('color', 20)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('time_off', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mechanic_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('note')->nullable();
            $table->timestamps();
            $table->index(['mechanic_id', 'starts_on']);
        });

        Schema::create('closures', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 40)->nullable()->index();
            $table->string('email')->nullable();
            $table->string('company_code', 40)->nullable();
            $table->string('vat_code', 40)->nullable();
            $table->string('address')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index('name');
        });

        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10);
            $table->string('make_model');
            $table->unsignedSmallInteger('year')->nullable();
            $table->string('plate', 20)->nullable()->index();
            $table->string('vin', 32)->nullable();
            $table->timestamps();
        });

        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('number')->unique();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('mechanic_id')->constrained()->restrictOnDelete();
            $table->text('description');
            $table->date('start_date');
            $table->unsignedTinyInteger('start_quarter');
            $table->unsignedSmallInteger('duration_quarters');
            $table->unsignedSmallInteger('planned_quarters');
            $table->string('status', 20)->default('scheduled')->index();
            $table->string('notify_customer', 10)->nullable()->index();
            $table->unsignedInteger('mileage')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['mechanic_id', 'start_date']);
            $table->index('start_date');
        });

        Schema::create('work_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 10);
            $table->string('description');
            $table->decimal('quantity', 10, 2);
            $table->string('unit', 10);
            $table->integer('unit_price_cents');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->unique()->constrained()->restrictOnDelete();
            $table->string('series', 10);
            $table->unsignedInteger('number');
            $table->date('issued_on');
            $table->date('due_on');
            $table->json('seller');
            $table->json('buyer');
            $table->boolean('vat_payer');
            $table->decimal('vat_rate', 5, 2);
            $table->integer('subtotal_cents');
            $table->integer('vat_cents');
            $table->integer('total_cents');
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();
            $table->unique(['series', 'number']);
        });

        Schema::create('invoice_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 10);
            $table->string('description');
            $table->decimal('quantity', 10, 2);
            $table->string('unit', 10);
            $table->integer('unit_price_cents');
            $table->integer('line_total_cents');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value')->nullable();
            $table->timestamps();
        });

        Schema::create('activity_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->nullableMorphs('subject');
            $table->string('action', 40);
            $table->json('changes')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        foreach (['activity_log', 'settings', 'invoice_lines', 'invoices', 'work_order_lines', 'work_orders', 'vehicles', 'customers', 'closures', 'time_off', 'mechanics'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
