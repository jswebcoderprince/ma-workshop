<?php

namespace Database\Seeders;

use App\Enums\NotifyDirection;
use App\Enums\WorkOrderStatus;
use App\Models\Customer;
use App\Models\Mechanic;
use App\Models\TimeOff;
use App\Models\WorkOrder;
use App\Scheduling\Availability;
use App\Scheduling\Position;
use App\Scheduling\WorkCalendar;
use App\Support\Workshop;
use Illuminate\Database\Seeder;

/**
 * Fictional sample data: four mechanics, 32 customers, about five weeks of jobs from this week's Monday.
 * Names, phones and plates are made up. Same data as design/frame.html.
 */
class DemoSeeder extends Seeder
{
    private const MECHANICS = [
        ['Tomas', ['car'], [1, 2, 3, 4, 5, 6]],
        ['Rolandas', ['car'], [1, 2, 3, 4, 5, 6]],
        ['Darius', ['moto', 'water'], [1, 2, 3, 4, 5, 6]],
        ['Mantas', ['car'], [1, 2, 3, 4, 5]],
    ];

    private const CUSTOMERS = [
        ['Mindaugas Petrauskas', '+370 612 34501', 'VW Passat', 2014, 'KLM214', 'car'],
        ['Jūratė Kazlauskienė', '+370 645 11872', 'Toyota Avensis', 2011, 'HBN507', 'car'],
        ['Rokas Adomaitis', '+370 686 20934', 'Yamaha MT-07', 2019, '42GTR', 'moto'],
        ['Egidijus Rimkus', '+370 699 47120', 'Audi A6 2.0 TDI', 2009, 'DFA880', 'car'],
        ['Simona Vaitkutė', '+370 614 70251', 'Opel Astra', 2016, 'LRK133', 'car'],
        ['Tadas Butkus', '+370 652 38816', 'Yamaha WaveRunner VX', 2018, null, 'water'],
        ['Gintaras Mockus', '+370 620 59003', 'Škoda Octavia', 2013, 'JPE241', 'car'],
        ['Ieva Stankevičiūtė', '+370 675 81420', 'Honda CB500F', 2017, '18KSL', 'moto'],
        ['Darius Žukauskas', '+370 688 02147', 'BMW 320d', 2015, 'MZT902', 'car'],
        ['Lina Daukšienė', '+370 611 93358', 'Ford Focus', 2017, 'GVA615', 'car'],
        ['Paulius Navickas', '+370 607 44129', 'KTM 390 Duke', 2020, '77PNV', 'moto'],
        ['Rasa Grigaitė', '+370 630 18834', 'Nissan Qashqai', 2018, 'KHR370', 'car'],
        ['Vytautas Jankauskas', '+370 698 56230', 'Mercedes-Benz E220', 2012, 'EVJ018', 'car'],
        ['Agnė Paulauskaitė', '+370 646 20785', 'Renault Megane', 2015, 'BLA422', 'car'],
        ['Andrius Urbonas', '+370 615 77391', 'Volvo XC60', 2016, 'NUR761', 'car'],
        ['Kęstutis Lukoševičius', '+370 687 31402', 'Sea-Doo GTI 130', 2017, null, 'water'],
        ['Eglė Bružaitė', '+370 622 05518', 'Peugeot 308', 2014, 'CEB309', 'car'],
        ['Marius Kairys', '+370 679 64110', 'Mazda 6', 2013, 'FKM554', 'car'],
        ['Laura Vasiliauskienė', '+370 640 27763', 'Toyota RAV4', 2019, 'LVR190', 'car'],
        ['Saulius Ramanauskas', '+370 693 80451', 'Honda Africa Twin', 2018, '05SRM', 'moto'],
        ['Giedrius Kavaliauskas', '+370 618 32279', 'Subaru Outback', 2013, 'GKV377', 'car'],
        ['Monika Žilinskienė', '+370 664 90215', 'Kia Sportage', 2017, 'MZL248', 'car'],
        ['Rimantas Baranauskas', '+370 601 15946', 'Audi A4', 2011, 'RBA731', 'car'],
        ['Justina Petrulytė', '+370 657 72380', 'Citroën C4', 2015, 'JPT066', 'car'],
        ['Edvinas Sabaliauskas', '+370 629 46613', 'VW Golf', 2012, 'ESB815', 'car'],
        ['Vaida Morkūnienė', '+370 670 38190', 'Hyundai i30', 2016, 'VMK429', 'car'],
        ['Arūnas Šimkus', '+370 685 21734', 'Suzuki GSX-R750', 2011, '31ASM', 'moto'],
        ['Karolis Venckus', '+370 616 58802', 'BMW 530d', 2014, 'KVN670', 'car'],
        ['Tomas Jonaitis', '+370 694 13367', 'Opel Insignia', 2015, 'TJN284', 'car'],
        ['Inga Kučinskienė', '+370 648 60521', 'Toyota Corolla', 2018, 'IKC913', 'car'],
        ['Žygimantas Gudaitis', '+370 613 87740', 'VW Touran', 2010, 'ZGD102', 'car'],
        ['Evelina Lukšaitė', '+370 662 29058', 'Škoda Superb', 2017, 'ELK356', 'car'],
    ];

    // Per mechanic, in order: [customer #, work, quarters, gap after (negative = overlap), status, notify, planned quarters]
    private const PLAN = [
        [[9, 'Variklio diagnostika', 2, 6, 'completed', null, 4], [4, 'Turbinos keitimas', 8, 0], [1, 'Paskirstymo diržo keitimas', 4, 0],
            [13, 'Galvutės tarpinės keitimas', 8, 0], [15, 'Purkštukų remontas', 3, 1], [18, 'Variklio diagnostika', 1, 0],
            [19, 'Dvimasio smagračio keitimas', 6, 0], [17, 'EGR vožtuvo valymas', 2, 0], [7, 'Sankabos keitimas', 5, 3], [14, 'Kuro sistemos remontas', 4, 0]],
        [[2, 'Variklio kapitalinis remontas', 12, 0, 'in_progress'], [5, 'Stabdžių sistemos remontas', 2, 0], [10, 'Pavarų dėžės remontas', 8, 0],
            [12, 'Alyvos ir filtrų keitimas', 1, 1], [21, 'Sankabos keitimas', 5, 0], [22, 'Važiuoklės remontas', 3, 2],
            [23, 'Paskirstymo diržo keitimas', 4, 0], [25, 'Pavarų dėžės remontas', 8, 0, null, 'later'], [28, 'Variklio diagnostika', 2, 0]],
        [[6, 'Variklio aptarnavimas', 4, -4, 'waiting_parts'], [3, 'Sezoninis aptarnavimas', 2, 0, 'in_progress'], [8, 'Grandinės ir žvakių keitimas', 1, 0],
            [16, 'Variklio aptarnavimas', 6, 2], [11, 'Sezoninis aptarnavimas', 2, 0], [20, 'Variklio diagnostika', 2, 4],
            [27, 'Kuro sistemos remontas', 4, 0, null, 'earlier']],
        [[24, 'Stabdžių sistemos remontas', 3, 0, 'in_progress'], [26, 'Alyvos ir filtrų keitimas', 1, 0], [29, 'Turbinos keitimas', 6, -2, null, null, 4],
            [30, 'Važiuoklės remontas', 4, 0], [31, 'Galvutės tarpinės keitimas', 8, 4], [32, 'Kondicionavimo sistemos remontas', 3, 0]],
    ];

    public function run(): void
    {
        $workshop = new Workshop;
        $cal = $workshop->calendar();
        $monday = WorkCalendar::addDays($workshop->today(), 1 - WorkCalendar::weekday($workshop->today()));

        $mechanics = [];
        foreach (self::MECHANICS as $i => [$name, $types, $days]) {
            $mechanics[] = Mechanic::create(['name' => $name, 'vehicle_types' => $types, 'work_days' => $days, 'sort_order' => $i]);
        }

        TimeOff::create(['mechanic_id' => $mechanics[0]->id, 'type' => 'holiday', 'starts_on' => WorkCalendar::addDays($monday, 28), 'ends_on' => WorkCalendar::addDays($monday, 30)]);
        TimeOff::create(['mechanic_id' => $mechanics[1]->id, 'type' => 'holiday', 'starts_on' => WorkCalendar::addDays($monday, 14), 'ends_on' => WorkCalendar::addDays($monday, 18)]);
        TimeOff::create(['mechanic_id' => $mechanics[2]->id, 'type' => 'day_off', 'starts_on' => WorkCalendar::addDays($monday, 4), 'ends_on' => WorkCalendar::addDays($monday, 4)]);

        $customers = [];
        foreach (self::CUSTOMERS as $i => [$name, $phone, $make, $year, $plate, $type]) {
            $c = Customer::create(['name' => $name, 'phone' => $phone]);
            $c->vehicles()->create(['type' => $type, 'make_model' => $make, 'year' => $year, 'plate' => $plate]);
            $customers[$i + 1] = $c->load('vehicles');
        }

        $workshop = new Workshop; // reload with the new time off
        $avail = $workshop->availability();
        $now = $workshop->currentQuarter();

        foreach (self::PLAN as $mi => $jobs) {
            $mechanic = $mechanics[$mi];
            $cursor = new Position($monday, 0);
            foreach ($jobs as $p) {
                [$cn, $work, $dur, $gap] = $p;
                $start = $cal->normalize($cursor);
                while (! $this->fits($cal, $avail, $mechanic->id, $start, $dur)) {
                    $start = $cal->next($start);
                }
                $customer = $customers[$cn];
                $status = $p[4] ?? null;
                if ($status === null) {
                    $end = $cal->end($start, $dur);
                    $status = $end->isBefore($now) ? 'completed' : ($start->isBefore($now) || $start->equals($now) ? 'in_progress' : 'scheduled');
                }

                $job = WorkOrder::create([
                    'customer_id' => $customer->id,
                    'vehicle_id' => $customer->vehicles->first()->id,
                    'mechanic_id' => $mechanic->id,
                    'description' => $work,
                    'start_date' => $start->date,
                    'start_quarter' => $start->quarter,
                    'duration_quarters' => $dur,
                    'planned_quarters' => $p[6] ?? $dur,
                    'status' => WorkOrderStatus::from($status),
                    'notify_customer' => isset($p[5]) ? NotifyDirection::from($p[5]) : null,
                    'completed_at' => $status === 'completed' ? now() : null,
                ]);
                if ($status !== 'scheduled') {
                    self::sampleLines($job);
                }

                // Advance by duration + gap working quarters (a negative gap makes the next job overlap).
                $cursor = $start;
                for ($i = 0; $i < max(0, $dur + $gap); $i++) {
                    $cursor = $cal->next($cursor);
                }
            }
        }
    }

    /** Made-up work and parts lines with made-up prices (sample data), by the kind of work. */
    public static function sampleLines(WorkOrder $job): void
    {
        $labour = fn (string $d, float $h) => ['kind' => 'labour', 'description' => $d, 'quantity' => $h, 'unit' => 'h', 'unit_price_cents' => 4000];
        $part = fn (string $d, float $q, string $u, int $cents) => ['kind' => 'part', 'description' => $d, 'quantity' => $q, 'unit' => $u, 'unit_price_cents' => $cents];
        $lines = match ($job->description) {
            'Variklio diagnostika' => [$labour('Variklio diagnostika kompiuteriu', 1), $labour('Klaidų kodų analizė ir bandomasis važiavimas', 0.5)],
            'Variklio kapitalinis remontas' => [
                $labour('Variklio išardymas, defektavimas ir surinkimas', 14),
                $part('Stūmoklių žiedų komplektas', 1, 'set', 18600),
                $part('Galvutės tarpinė', 1, 'pcs', 6450),
                $part('Variklio alyva 5W-30', 5, 'l', 980),
            ],
            'Sezoninis aptarnavimas' => [$labour('Sezoninis aptarnavimas', 2), $part('Uždegimo žvakė', 2, 'pcs', 1240), $part('Alyva 10W-40', 3, 'l', 1120)],
            'Stabdžių sistemos remontas' => [$labour('Stabdžių kaladėlių ir diskų keitimas', 2.5), $part('Stabdžių kaladėlių komplektas', 1, 'set', 4890), $part('Stabdžių skystis DOT4', 1, 'l', 1250)],
            'Variklio aptarnavimas' => [$labour('Variklio aptarnavimas', 2), $part('Tepalo filtras', 1, 'pcs', 1460), $part('Variklio alyva', 4, 'l', 1050)],
            default => [$labour($job->description, 2)],
        };
        foreach ($lines as $i => $line) {
            $job->lines()->create($line + ['sort_order' => $i]);
        }
    }

    private function fits(WorkCalendar $cal, Availability $avail, int $mechanicId, Position $start, int $dur): bool
    {
        foreach ($cal->span($start, $dur) as $p) {
            if (! $avail->isAvailable($mechanicId, $p->date)) {
                return false;
            }
        }

        return true;
    }
}
