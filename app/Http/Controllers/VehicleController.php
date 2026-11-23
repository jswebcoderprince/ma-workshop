<?php

namespace App\Http\Controllers;

use App\Http\Requests\VehicleRequest;
use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use Illuminate\Http\RedirectResponse;

class VehicleController extends Controller
{
    public function store(VehicleRequest $request, Customer $customer): RedirectResponse
    {
        $vehicle = $customer->vehicles()->create($request->validated());
        ActivityLog::record('vehicle.created', $vehicle, $request->validated());

        return back()->with('status', 'saved');
    }

    public function update(VehicleRequest $request, Vehicle $vehicle): RedirectResponse
    {
        $vehicle->update($request->validated());
        ActivityLog::record('vehicle.updated', $vehicle, $vehicle->getChanges());

        return back()->with('status', 'saved');
    }

    public function destroy(Vehicle $vehicle): RedirectResponse
    {
        if (WorkOrder::where('vehicle_id', $vehicle->id)->exists()) {
            return back()->withErrors(['vehicle' => __('This vehicle has jobs and cannot be deleted.')]);
        }
        ActivityLog::record('vehicle.deleted', null, $vehicle->only(['id', 'customer_id', 'make_model', 'plate']));
        $vehicle->delete();

        return back()->with('status', 'saved');
    }
}
