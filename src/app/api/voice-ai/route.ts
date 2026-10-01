import { NextRequest, NextResponse } from 'next/server';

// Common OR abbreviation normalizer
function polishMedicalSpeech(rawText: string): string {
  let cleaned = rawText.trim();

  const replacements: Array<[RegExp, string]> = [
    [/\btransesophageal echocardiogram\b/gi, 'TEE'],
    [/\bcardiac cath lab\b/gi, 'CCL'],
    [/\belectrophysiology\b/gi, 'EP'],
    [/\binterventional radiology\b/gi, 'IR'],
    [/\bpost anesthesia care unit\b/gi, 'PACU'],
    [/\bpre operative\b/gi, 'Pre-op'],
    [/\bpost operative\b/gi, 'Post-op'],
    [/\bat twelve hundred\b/gi, '1200'],
    [/\bat twelve thirty\b/gi, '1230'],
    [/\bat thirteen hundred\b/gi, '1300'],
    [/\bat one o'clock\b/gi, '1300'],
    [/\bat two o'clock\b/gi, '1400'],
    [/\bat seven in the morning\b/gi, '0700'],
    [/\bgoing home at (\d+)\b/gi, 'Leaves @ $1:00'],
    [/\bdelayed for labs\b/gi, 'Delay (labs)'],
    [/\bdelayed for consent\b/gi, 'Delay (consent)'],
    [/\badd on case\b/gi, 'Add-on case'],
    [/\bemergency case\b/gi, 'STAT emergency'],
    [/\bsecond case\b/gi, 'Case #2'],
    [/\bfirst case\b/gi, 'Case #1']
  ];

  for (const [pattern, replacement] of replacements) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();
    if (!transcript) {
      return NextResponse.json({ error: 'Transcript required' }, { status: 400 });
    }

    const polished = polishMedicalSpeech(transcript);

    return NextResponse.json({
      raw: transcript,
      polished: polished
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Voice processing error' }, { status: 500 });
  }
}
