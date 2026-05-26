-- Seed extraction templates for all 5 contractors (job_card + invoice each)

INSERT INTO contractor_extraction_templates (contractor_id, doc_type, version, config_json, is_active)
SELECT c.id, t.doc_type, '1.0.0', t.config_json, TRUE
FROM contractors c
CROSS JOIN (
  VALUES
    ('job_card', '{"template_key":"generic_v1","zones":{"header":{"x0":0.05,"y0":0.02,"x1":0.95,"y1":0.25},"body":{"x0":0.05,"y0":0.25,"x1":0.95,"y1":0.75},"totals":{"x0":0.55,"y0":0.75,"x1":0.95,"y1":0.9},"signature":{"x0":0.05,"y0":0.85,"x1":0.45,"y1":0.98}},"regex":{"job_card_number":"(?i)(?:job\\s*(?:card|no\\.?|#)\\s*[:#]?\\s*)([A-Z0-9\\-/]+)","service_date":"(?i)(?:date|service date)\\s*[:#]?\\s*(\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})","site_name":"(?i)(?:site|client|location)\\s*[:#]?\\s*([^\\n]+)","technician_name":"(?i)(?:technician|engineer|tech)\\s*[:#]?\\s*([^\\n]+)","hours_worked":"(?i)(?:hours?|time on site)\\s*[:#]?\\s*(\\d+(?:\\.\\d+)?)","po_number":"(?i)(?:p\\.?o\\.?\\s*(?:no\\.?|number)?)\\s*[:#]?\\s*([A-Z0-9\\-/]+)"},"fields":["service_date","job_card_number","site_name","site_location","technician_name","hours_worked","work_description","materials_used","labour_charges","travel_charges","po_number","signature_present"]}'::jsonb),
    ('invoice', '{"template_key":"generic_v1","zones":{"header":{"x0":0.05,"y0":0.02,"x1":0.95,"y1":0.22},"line_items":{"x0":0.05,"y0":0.22,"x1":0.95,"y1":0.72},"totals":{"x0":0.55,"y0":0.72,"x1":0.95,"y1":0.92}},"regex":{"invoice_number":"(?i)(?:invoice\\s*(?:no\\.?|#)\\s*[:#]?\\s*)([A-Z0-9\\-/]+)","referenced_job_card_number":"(?i)(?:job\\s*(?:card|ref\\.?|reference)\\s*[:#]?\\s*)([A-Z0-9\\-/]+)","service_date":"(?i)(?:date|invoice date)\\s*[:#]?\\s*(\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})","subtotal":"(?i)sub\\s*total\\s*[:#]?\\s*R?\\s*([\\d,]+(?:\\.\\d{2})?)","vat":"(?i)(?:vat|tax)\\s*[:#]?\\s*R?\\s*([\\d,]+(?:\\.\\d{2})?)","total":"(?i)(?:total|amount due)\\s*[:#]?\\s*R?\\s*([\\d,]+(?:\\.\\d{2})?)","po_number":"(?i)(?:p\\.?o\\.?\\s*(?:no\\.?|number)?)\\s*[:#]?\\s*([A-Z0-9\\-/]+)","vat_number":"(?i)(?:vat\\s*(?:reg\\.?|no\\.?))\\s*[:#]?\\s*(\\d+)"},"fields":["service_date","invoice_number","referenced_job_card_number","site_name","site_location","hours_worked","work_description","materials_used","labour_charges","travel_charges","subtotal","vat","total","po_number"]}'::jsonb)
) AS t(doc_type, config_json)
WHERE c.code IN (
  'alpha_electrical', 'beta_hvac', 'gamma_plumbing', 'delta_security', 'epsilon_facilities'
)
ON CONFLICT (contractor_id, doc_type, version) DO UPDATE SET config_json = EXCLUDED.config_json;

-- Contractor-specific overrides (Alpha & Beta — phase 1 emphasis)
UPDATE contractor_extraction_templates cet
SET config_json = config_json || '{"contractor_override":"alpha_electrical","job_card_prefix":"ALP-"}'::jsonb
FROM contractors c
WHERE cet.contractor_id = c.id AND c.code = 'alpha_electrical' AND cet.doc_type = 'job_card';

UPDATE contractor_extraction_templates cet
SET config_json = config_json || '{"contractor_override":"beta_hvac","job_card_prefix":"BHV-"}'::jsonb
FROM contractors c
WHERE cet.contractor_id = c.id AND c.code = 'beta_hvac' AND cet.doc_type = 'job_card';

UPDATE contractor_extraction_templates cet
SET config_json = config_json || '{"contractor_override":"gamma_plumbing","job_card_prefix":"GPL-"}'::jsonb
FROM contractors c
WHERE cet.contractor_id = c.id AND c.code = 'gamma_plumbing' AND cet.doc_type = 'job_card';

UPDATE contractor_extraction_templates cet
SET config_json = config_json || '{"contractor_override":"delta_security","job_card_prefix":"DSS-"}'::jsonb
FROM contractors c
WHERE cet.contractor_id = c.id AND c.code = 'delta_security' AND cet.doc_type = 'job_card';

UPDATE contractor_extraction_templates cet
SET config_json = config_json || '{"contractor_override":"epsilon_facilities","job_card_prefix":"EPS-"}'::jsonb
FROM contractors c
WHERE cet.contractor_id = c.id AND c.code = 'epsilon_facilities' AND cet.doc_type = 'job_card';
