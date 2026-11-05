import { writeFileSync } from 'fs';
import { buildFinanceReportPdf } from '../app/lib/support-calls/pdf';

async function main() {
  const buffer = await buildFinanceReportPdf({
    sc: {
      support_call_number: 'SC-SMOKE-001',
      client: 'Balwin',
      estate_or_building: 'Munyaka',
      cml_location: 'Gate 7',
      onsite_location: 'Visitor Entrance / Gatehouse with a particularly long description that must wrap',
      site_name: 'Visitor Entrance / Gatehouse',
      priority: 'High',
      original_description:
        'Access control failure reported at visitor entrance. Technician found controller offline after power surge. Long diagnosis text to verify wrapping across multiple lines in the summary table without overlapping adjacent columns.',
      supplier_invoice_number: 'INV-998877',
      third_party_job_card_number: 'JC-EXT-4455',
      po_number: 'PO-2026-001122',
      external_quote_reference: 'Q-ALT-7788-VERY-LONG-REFERENCE',
    },
    version: 1,
    jobCardVersion: 2,
    signedBy: 'Site Manager Example',
    signatureException: null,
    memberNames: { a1: 'Tech One', a2: 'Tech Two' },
    visits: [
      {
        visit_number: 1,
        party_type: 'internal',
        assignment_id: 'a1',
        arrived_at: '2026-11-03T08:00:00Z',
        departed_at: '2026-11-03T10:15:00Z',
        labour_minutes: 135,
        travel_km: 42,
        travel_amount_zar: 243.6,
        work_performed: 'Replaced controller, tested readers, verified MAC addresses on network switches.',
        incomplete: false,
      },
      {
        visit_number: 2,
        party_type: 'external',
        arrived_at: null,
        departed_at: null,
        labour_minutes: 90,
        external_travel_cost_zar: 850.5,
        work_performed: 'Partner supplied specialised network diagnostic and travel as quoted.',
        incomplete: false,
      },
      {
        visit_number: 3,
        party_type: 'internal',
        assignment_id: 'a2',
        arrived_at: '2026-11-04T09:00:00Z',
        departed_at: '2026-11-04T09:45:00Z',
        labour_minutes: 45,
        travel_km: 18,
        travel_amount_zar: 104.4,
        work_performed: 'Follow-up verification.',
        incomplete: true,
        incomplete_reason: 'Awaiting replacement cable stock from warehouse',
      },
    ],
    quotes: [
      {
        supplier_name: 'Network Parts SA with a long company name',
        revision: 2,
        amount: 12500.55,
        currency: 'ZAR',
        status: 'approved',
        quote_reference: 'QR-LONG-REF-001',
        description: 'Controller + labour allowance. Detailed description to confirm table wrap.',
      },
    ],
    hardware: [
      {
        quantity: 1,
        description: 'Access controller board',
        make_model: 'Loomiot XC-900',
        serial_number: 'SN-ABC-123456',
        old_mac: 'AA:BB:CC:DD:EE:01',
        new_mac: 'AA:BB:CC:DD:EE:99',
        old_equipment: 'Failed controller',
        new_equipment: 'Replacement controller',
        replacement_reason: 'Hardware failure after surge',
      },
    ],
  });

  const out = 'scripts/smoke-finance-handover.pdf';
  writeFileSync(out, buffer);
  console.log(`Wrote ${out} (${buffer.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
