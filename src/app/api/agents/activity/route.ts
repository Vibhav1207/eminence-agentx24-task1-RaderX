import { apiSuccess } from '@/lib/api/response';

export async function GET() {
  const activities = [
    {
      id: 'act-1',
      time: '10:31 AM',
      agentName: 'Patent Agent',
      action: 'Found 3 newly published USPTO filings for low-precision tensor quantization.',
    },
    {
      id: 'act-2',
      time: '10:32 AM',
      agentName: 'RadarX Orchestrator',
      action: 'Correlating patent spike with recent arXiv preprints and SEC 8-K disclosures.',
    },
    {
      id: 'act-3',
      time: '10:33 AM',
      agentName: 'Signal Agent',
      action: 'Detected AI Infrastructure Acceleration signal (+42% momentum) across 4 streams.',
    },
    {
      id: 'act-4',
      time: '10:35 AM',
      agentName: 'Synthesis Agent',
      action: 'Generated 3 actionable recommendations for target intelligence workspace.',
    },
  ];

  return apiSuccess(activities);
}
