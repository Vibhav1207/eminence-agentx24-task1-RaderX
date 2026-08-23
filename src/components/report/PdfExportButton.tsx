'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ExecutiveBriefModel, EvidenceModel } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PdfExportButtonProps {
  brief: ExecutiveBriefModel;
  evidence: EvidenceModel[];
}

export function PdfExportButton({ brief, evidence }: PdfExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'capturing' | 'generating' | 'success' | 'error'>('idle');
  const contentRef = useRef<HTMLDivElement>(null);

  const buildReportContent = () => {
    const dateStr = new Date(brief.generatedAt || Date.now()).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const recommendedActions = brief.recommendedActions || [];

    return (
      <div
        ref={contentRef}
        className="pdf-report-container"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '20mm',
          background: '#FAF9F6',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#111827',
          boxSizing: 'border-box',
        }}
      >
        <style jsx>{`
          .pdf-report-container * {
            box-sizing: border-box;
          }
          .pdf-report-container h1, .pdf-report-container h2, .pdf-report-container h3 {
            font-family: 'Inter', system-ui, sans-serif;
            font-weight: 800;
            line-height: 1.2;
            color: #111827;
          }
          .pdf-report-container p, .pdf-report-container li {
            font-family: 'Inter', system-ui, sans-serif;
            line-height: 1.6;
            color: #374151;
          }
          .pdf-report-container .page-break {
            page-break-before: always;
            break-before: page;
          }
          .pdf-report-container .avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        `}</style>

        {/* Header / Cover */}
        <div className="avoid-break" style={{ paddingBottom: '30mm', borderBottom: '3px solid #D4AF37', marginBottom: '20mm' }}>
          <div style={{ textAlign: 'center', marginBottom: '10mm' }}>
            <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.3em', color: '#047857', textTransform: 'uppercase', marginBottom: '4px' }}>
              RADARX AUTONOMOUS INTELLIGENCE
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', marginBottom: '2px' }}>
              EXECUTIVE INTELLIGENCE BRIEF
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#8C6D13', letterSpacing: '0.15em', textTransform: 'uppercase', borderTop: '1px solid #D4AF37', paddingTop: '8px', display: 'inline-block' }}>
              CLASSIFIED • STRATEGIC ASSESSMENT
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '10mm' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#111827', lineHeight: 1.3, marginBottom: '6mm' }}>
              {brief.title}
            </h1>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12mm', flexWrap: 'wrap', fontSize: '11px', fontFamily: 'monospace' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '2px' }}>Investigation ID</div>
                <div style={{ fontWeight: 700, color: '#111827' }}>{brief.investigationId}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '2px' }}>Version</div>
                <div style={{ fontWeight: 700, color: '#111827' }}>v{brief.version || 1}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '2px' }}>Generated</div>
                <div style={{ fontWeight: 700, color: '#111827' }}>{dateStr}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '2px' }}>Confidence</div>
                <div style={{ fontWeight: 700, color: '#047857' }}>{brief.confidence == null ? 'UNAVAILABLE' : `${brief.confidence}%`}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="avoid-break" style={{ marginBottom: '12mm' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#8C6D13', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', borderBottom: '2px solid #D4AF37', paddingBottom: '4px', display: 'inline-block' }}>
            EXECUTIVE SUMMARY
          </h2>
          <p style={{ fontSize: '13px', lineHeight: 1.8, color: '#111827', marginTop: '6mm', fontWeight: 500 }}>
            {brief.executiveSummary}
          </p>
        </div>

        {/* Key Findings - use keyChanges instead of keyFindings */}
        {(brief.keyChanges || []).length > 0 && (
          <div className="avoid-break" style={{ marginBottom: '12mm' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#8C6D13', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', borderBottom: '2px solid #D4AF37', paddingBottom: '4px', display: 'inline-block' }}>
              KEY FINDINGS ({(brief.keyChanges || []).length})
            </h2>
            <div style={{ marginTop: '6mm' }}>
              {(brief.keyChanges || []).map((kf: any, idx: number) => (
                <div key={idx} className="avoid-break" style={{ marginBottom: '8mm', padding: '6mm', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', borderLeft: '4px solid #D4AF37' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4mm', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#8C6D13', background: '#FAF9F6', padding: '3px 8px', borderRadius: '4px', border: '1px solid #D4AF37/30', textTransform: 'uppercase' }}>
                      FINDING #{idx + 1} • {kf.impact || 'HIGH'} IMPACT
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#047857', fontFamily: 'monospace' }}>
                      {kf.confidence == null ? 'UNAVAILABLE' : `${kf.confidence}%`} CONFIDENCE
                    </span>
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', marginBottom: '3mm', lineHeight: 1.3 }}>
                    {kf.title || kf.description?.slice(0, 100) || 'Key Finding'}
                  </h3>
                  <p style={{ fontSize: '12px', lineHeight: 1.7, color: '#374151' }}>
                    {kf.description || kf.title}
                  </p>
                  {kf.evidenceIds && kf.evidenceIds.length > 0 && (
                    <div style={{ marginTop: '4mm', paddingTop: '3mm', borderTop: '1px solid #E5E7EB', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '8px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CITATIONS:</span>
                      {kf.evidenceIds.map((evId: string, evIdx: number) => (
                        <span key={`${evId}-${evIdx}`} style={{ fontSize: '9px', fontFamily: 'monospace', color: '#111827', background: '#FAF9F6', padding: '3px 8px', borderRadius: '4px', border: '1px solid #E5E7EB' }}>
                          [{evId}]
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategic Implications */}
        {(brief.strategicImplications || []).length > 0 && (
          <div className="avoid-break" style={{ marginBottom: '12mm' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#8C6D13', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', borderBottom: '2px solid #D4AF37', paddingBottom: '4px', display: 'inline-block' }}>
              STRATEGIC IMPLICATIONS
            </h2>
            <ul style={{ marginTop: '6mm', paddingLeft: '6mm', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '5mm' }}>
              {(brief.strategicImplications || []).map((si: any, idx: number) => (
                <li key={idx} className="avoid-break" style={{ padding: '5mm', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', borderLeft: '4px solid #8C6D13' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#8C6D13', textTransform: 'uppercase', marginBottom: '2mm' }}>
                    {si.topic || `IMPLICATION ${idx + 1}`}
                  </div>
                  <p style={{ fontSize: '12px', lineHeight: 1.7, color: '#374151' }}>
                    {si.implication}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Threats */}
        {(brief.threats || []).length > 0 && (
          <div className="avoid-break" style={{ marginBottom: '12mm' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', borderBottom: '2px solid #DC2626', paddingBottom: '4px', display: 'inline-block' }}>
              THREAT MATRIX
            </h2>
            <div style={{ marginTop: '6mm', display: 'flex', flexDirection: 'column', gap: '5mm' }}>
              {(brief.threats || []).map((t: any, idx: number) => (
                <div key={idx} className="avoid-break" style={{ padding: '5mm', background: '#FFFFFF', border: '1px solid #FECACA', borderRadius: '8px', borderLeft: '4px solid #DC2626' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm', flexWrap: 'wrap', gap: '4px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>{t.title}</h3>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#991B1B', background: '#FEF2F2', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FECACA', textTransform: 'uppercase' }}>
                      IMPACT: {t.impact || 'HIGH'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', lineHeight: 1.7, color: '#374151' }}>{t.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opportunities */}
        {(brief.opportunities || []).length > 0 && (
          <div className="avoid-break" style={{ marginBottom: '12mm' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', borderBottom: '2px solid #059669', paddingBottom: '4px', display: 'inline-block' }}>
              OPPORTUNITY MATRIX
            </h2>
            <div style={{ marginTop: '6mm', display: 'flex', flexDirection: 'column', gap: '5mm' }}>
              {(brief.opportunities || []).map((o: any, idx: number) => (
                <div key={idx} className="avoid-break" style={{ padding: '5mm', background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: '8px', borderLeft: '4px solid #059669' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm', flexWrap: 'wrap', gap: '4px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>{o.title}</h3>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#047857', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #BBF7D0', textTransform: 'uppercase' }}>
                      POTENTIAL: {o.potentialImpact || 'HIGH'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', lineHeight: 1.7, color: '#374151' }}>{o.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {(brief.recommendedActions || []).length > 0 && (
          <div className="avoid-break" style={{ marginBottom: '12mm' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#8C6D13', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', borderBottom: '2px solid #D4AF37', paddingBottom: '4px', display: 'inline-block' }}>
              RECOMMENDED ACTIONS
            </h2>
            <div style={{ marginTop: '6mm', display: 'flex', flexDirection: 'column', gap: '5mm' }}>
              {recommendedActions.map((rec: any, idx: number) => (
                <div key={rec.id || idx} className="avoid-break" style={{ padding: '5mm', background: '#FAF9F6', border: '1px solid #E5E7EB', borderRadius: '8px', borderLeft: '4px solid #D4AF37' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2mm', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#8C6D13', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {rec.timeHorizon} HORIZON
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#991B1B', background: '#FEF2F2', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FECACA', textTransform: 'uppercase' }}>
                      {rec.priority} PRIORITY
                    </span>
                  </div>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#111827', marginBottom: '1mm' }}>{rec.action}</h3>
                  <p style={{ fontSize: '12px', lineHeight: 1.7, color: '#374151' }}>{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence Sources */}
        <div className="avoid-break" style={{ marginBottom: '12mm' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#8C6D13', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', borderBottom: '2px solid #D4AF37', paddingBottom: '4px', display: 'inline-block' }}>
            PRIMARY EVIDENCE SOURCES ({evidence.length} ITEMS)
          </h2>
          <div style={{ marginTop: '6mm', display: 'flex', flexDirection: 'column', gap: '5mm' }}>
            {evidence.map((ev, idx) => (
              <div key={ev.id} className="avoid-break" style={{ padding: '5mm', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2mm', flexWrap: 'wrap', gap: '4px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>{ev.title}</h3>
                  <span style={{ fontSize: '8px', fontWeight: 800, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    {ev.sourceType}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#6B7280', lineHeight: 1.8, fontFamily: 'monospace' }}>
                  <div><strong>Source:</strong> {ev.source}</div>
                  <div><strong>URL:</strong> {ev.url || 'N/A'}</div>
                  <div><strong>Date:</strong> {ev.publishedAt ? new Date(ev.publishedAt).toLocaleDateString() : 'N/A'}</div>
                  <div><strong>Relevance:</strong> {ev.relevanceScore || 'N/A'}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer / Attribution */}
        <div style={{ marginTop: '20mm', paddingTop: '6mm', borderTop: '1px solid #E5E7EB', textAlign: 'center', fontSize: '10px', color: '#6B7280', fontFamily: 'monospace' }}>
          <div style={{ fontWeight: 700, color: '#111827', marginBottom: '2mm' }}>— END OF REPORT —</div>
          <div>Generated by RadarX Autonomous Intelligence Engine</div>
          <div>{dateStr}</div>
          <div>All citations traceable to primary source providers (Crossref, USPTO, NewsAPI, Web)</div>
          <div style={{ marginTop: '4mm', fontSize: '9px' }}>This report contains strategic intelligence assessments. Distribution limited to authorized personnel.</div>
        </div>
      </div>
    );
  };

  const handleExportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    setStatus('capturing');

    try {
      // Create a hidden container for rendering the report
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.zIndex = '-1';
      container.style.overflow = 'visible';
      document.body.appendChild(container);

      // Render the report content
      const reportElement = buildReportContent();
      
      // We need to render to string first, then use a different approach
      // Actually, let's use a more robust method - render to a hidden div and capture
      
      // Create the full HTML for the report
      const reportHtml = generateReportHtml(brief, evidence);
      
      // Write to a temporary iframe for rendering
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '210mm';
      iframe.style.height = 'auto';
      iframe.style.border = 'none';
      iframe.style.background = '#FAF9F6';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) throw new Error('Could not access iframe document');
      
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', system-ui, sans-serif; background: #FAF9F6; color: #111827; }
            .pdf-report { width: 210mm; min-height: 297mm; padding: 20mm; box-sizing: border-box; }
            h1 { font-size: 28px; font-weight: 900; color: #111827; letter-spacing: -0.02em; line-height: 1.2; }
            h2 { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; padding-bottom: 4px; display: inline-block; }
            h3 { font-size: 15px; font-weight: 800; color: #111827; margin-bottom: 3mm; line-height: 1.3; }
            p, li { font-size: 12px; line-height: 1.7; color: #374151; }
            .section { margin-bottom: 12mm; }
            .avoid-break { page-break-inside: avoid; break-inside: avoid; }
            .card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 5mm; }
            .card-bordered { border-left: 4px solid; }
            .gold { border-left-color: #D4AF37; }
            .red { border-left-color: #DC2626; }
            .green { border-left-color: #059669; }
            .meta-grid { display: flex; justify-content: center; gap: 12mm; flex-wrap: wrap; font-size: 11px; font-family: monospace; }
            .meta-item { text-align: center; }
            .meta-label { font-size: 9px; color: #6B7280; text-transform: uppercase; margin-bottom: 2px; }
            .meta-value { font-weight: 700; color: #111827; }
            .badge { font-size: 9px; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; display: inline-block; }
            .badge-gold { background: #FAF9F6; color: #8C6D13; border: 1px solid #D4AF37; }
            .badge-green { background: #ECFDF5; color: #047857; border: 1px solid #BBF7D0; }
            .badge-red { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
            .evidence-grid { display: flex; flex-direction: column; gap: 5mm; }
            .footer { margin-top: 20mm; padding-top: 6mm; border-top: 1px solid #E5E7EB; text-align: center; font-size: 10px; color: #6B7280; font-family: monospace; }
            .executive-summary p { font-size: 13px; line-height: 1.8; color: #111827; font-weight: 500; }
            .header { text-align: center; padding-bottom: 30mm; border-bottom: 3px solid #D4AF37; margin-bottom: 20mm; }
            .actions-grid { display: flex; flex-direction: column; gap: 5mm; }
            .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 5mm; }
          </style>
        </head>
        <body>
          <div class="pdf-report">
            ${reportHtml}
          </div>
        </body>
        </html>
      `);
      doc.close();

      // Wait for fonts and content to load
      await new Promise<void>((resolve) => {
        const checkLoaded = () => {
          if (iframe.contentWindow?.document?.readyState === 'complete') {
            // Wait a bit more for fonts
            setTimeout(resolve, 500);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });

      setStatus('generating');

      // Capture the iframe content with html2canvas
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;

      const canvas = await html2canvas(iframe.contentDocument!.body, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: pageWidth,
        windowWidth: pageWidth,
        backgroundColor: '#FAF9F6',
      } as any);

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add subsequent pages
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Add page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // Clean up
      document.body.removeChild(iframe);
      document.body.removeChild(container);

      // Save
      pdf.save(`RadarX_Executive_Brief_${brief.investigationId}_v${brief.version || 1}.pdf`);
      
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('PDF export failed:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setExporting(false);
    }
  };

  const generateReportHtml = (brief: ExecutiveBriefModel, evidence: EvidenceModel[]): string => {
    const dateStr = new Date(brief.generatedAt || Date.now()).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let html = '';

    // Header
    html += `
      <div class="header">
        <div style="font-size: 10px; font-weight: 900; letter-spacing: 0.3em; color: #047857; text-transform: uppercase; margin-bottom: 4px;">
          RADARX AUTONOMOUS INTELLIGENCE
        </div>
        <div style="font-size: 28px; font-weight: 900; color: #111827; letter-spacing: -0.02em; margin-bottom: 2px;">
          EXECUTIVE INTELLIGENCE BRIEF
        </div>
        <div style="font-size: 11px; font-weight: 600; color: #8C6D13; letter-spacing: 0.15em; text-transform: uppercase; border-top: 1px solid #D4AF37; padding-top: 8px; display: inline-block; margin-top: 10px;">
          CLASSIFIED • STRATEGIC ASSESSMENT
        </div>
        <div style="text-align: center; margin-top: 10mm;">
          <h1>${brief.title}</h1>
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Investigation ID</div>
              <div class="meta-value">${brief.investigationId}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Version</div>
              <div class="meta-value">v${brief.version || 1}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Generated</div>
              <div class="meta-value">${dateStr}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Confidence</div>
            <div class="meta-value" style="color: #047857;">${brief.confidence == null ? 'UNAVAILABLE' : `${brief.confidence}%`}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Executive Summary
    html += `
      <div class="section executive-summary avoid-break">
        <h2 style="border-bottom-color: #D4AF37;">EXECUTIVE SUMMARY</h2>
        <p style="margin-top: 6mm;">${brief.executiveSummary}</p>
      </div>
    `;

    // Key Findings - use keyChanges instead of keyFindings
    if ((brief.keyChanges || []).length > 0) {
      html += `
        <div class="section avoid-break">
          <h2 style="border-bottom-color: #D4AF37;">KEY FINDINGS (${(brief.keyChanges || []).length})</h2>
          <div style="margin-top: 6mm; display: flex; flex-direction: column; gap: 8mm;">
      `;
      (brief.keyChanges || []).forEach((kf: any, idx: number) => {
        html += `
          <div class="card card-bordered gold avoid-break">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4mm; flex-wrap: wrap; gap: 4px;">
              <span class="badge badge-gold">FINDING #${idx + 1} • ${kf.impact || 'HIGH'} IMPACT</span>
              <span class="badge" style="background: #ECFDF5; color: #047857; border: 1px solid #BBF7D0;">${kf.confidence == null ? 'UNAVAILABLE' : `${kf.confidence}%`} CONFIDENCE</span>
            </div>
            <h3>${kf.title || kf.description?.slice(0, 100) || 'Key Finding'}</h3>
            <p>${kf.description || kf.title}</p>
        `;
        if (kf.evidenceIds && kf.evidenceIds.length > 0) {
          html += `
            <div style="margin-top: 4mm; padding-top: 3mm; border-top: 1px solid #E5E7EB; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
              <span style="font-size: 8px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em;">CITATIONS:</span>
          `;
          kf.evidenceIds.forEach((evId: string, evIdx: number) => {
            html += `<span style="font-size: 9px; font-family: monospace; color: #111827; background: #FAF9F6; padding: 3px 8px; border-radius: 4px; border: 1px solid #E5E7EB;">[${evId}]</span>`;
          });
          html += `</div>`;
        }
        html += `</div>`;
      });
      html += `</div></div>`;
    }

    // Strategic Implications
    if ((brief.strategicImplications || []).length > 0) {
      html += `
        <div class="section avoid-break">
          <h2 style="border-bottom-color: #D4AF37;">STRATEGIC IMPLICATIONS</h2>
          <div class="grid-2" style="margin-top: 6mm;">
      `;
      (brief.strategicImplications || []).forEach((si: any, idx: number) => {
        html += `
          <div class="card card-bordered gold avoid-break">
            <div style="font-size: 9px; font-weight: 700; color: #8C6D13; text-transform: uppercase; margin-bottom: 2mm;">${si.topic || `IMPLICATION ${idx + 1}`}</div>
            <p>${si.implication}</p>
          </div>
        `;
      });
      html += `</div></div>`;
    }

    // Threats
    if ((brief.threats || []).length > 0) {
      html += `
        <div class="section avoid-break">
          <h2 style="border-bottom-color: #DC2626; color: #991B1B;">THREAT MATRIX</h2>
          <div style="margin-top: 6mm; display: flex; flex-direction: column; gap: 5mm;">
      `;
      (brief.threats || []).forEach((t: any) => {
        html += `
          <div class="card card-bordered red avoid-break">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2mm; flex-wrap: wrap; gap: 4px;">
              <h3>${t.title}</h3>
              <span class="badge badge-red">IMPACT: ${t.impact || 'HIGH'}</span>
            </div>
            <p>${t.description}</p>
          </div>
        `;
      });
      html += `</div></div>`;
    }

    // Opportunities
    if ((brief.opportunities || []).length > 0) {
      html += `
        <div class="section avoid-break">
          <h2 style="border-bottom-color: #059669; color: #047857;">OPPORTUNITY MATRIX</h2>
          <div style="margin-top: 6mm; display: flex; flex-direction: column; gap: 5mm;">
      `;
      (brief.opportunities || []).forEach((o: any) => {
        html += `
          <div class="card card-bordered green avoid-break">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2mm; flex-wrap: wrap; gap: 4px;">
              <h3>${o.title}</h3>
              <span class="badge badge-green">POTENTIAL: ${o.potentialImpact || 'HIGH'}</span>
            </div>
            <p>${o.description}</p>
          </div>
        `;
      });
      html += `</div></div>`;
    }

    // Recommended Actions
    const recommendedActions = brief.recommendedActions || [];

    if (recommendedActions.length > 0) {
      html += `
        <div class="section avoid-break">
          <h2 style="border-bottom-color: #D4AF37;">RECOMMENDED ACTIONS</h2>
          <div class="actions-grid" style="margin-top: 6mm;">
      `;
      recommendedActions.forEach((rec: any) => {
        html += `
          <div class="card card-bordered gold avoid-break" style="background: #FAF9F6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2mm; flex-wrap: wrap; gap: 4px;">
              <span style="font-size: 9px; font-weight: 800; color: #8C6D13; text-transform: uppercase; letter-spacing: 0.05em;">${rec.timeHorizon} HORIZON</span>
              <span class="badge badge-red">${rec.priority} PRIORITY</span>
            </div>
            <h3>${rec.action}</h3>
            <p>${rec.reason}</p>
          </div>
        `;
      });
      html += `</div></div>`;
    }

    // Evidence Sources
    html += `
      <div class="section avoid-break">
        <h2 style="border-bottom-color: #D4AF37;">PRIMARY EVIDENCE SOURCES (${evidence.length} ITEMS)</h2>
        <div class="evidence-grid" style="margin-top: 6mm;">
    `;
    evidence.forEach((ev, idx) => {
      html += `
        <div class="card avoid-break">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2mm; flex-wrap: wrap; gap: 4px;">
            <h3>${ev.title}</h3>
            <span style="font-size: 8px; font-weight: 800; color: #6B7280; background: #F3F4F6; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">${ev.sourceType}</span>
          </div>
          <div style="font-size: 10px; color: #6B7280; line-height: 1.8; font-family: monospace;">
            <div><strong>Source:</strong> ${ev.source}</div>
            <div><strong>URL:</strong> ${ev.url || 'N/A'}</div>
            <div><strong>Date:</strong> ${ev.publishedAt ? new Date(ev.publishedAt).toLocaleDateString() : 'N/A'}</div>
            <div><strong>Relevance:</strong> ${ev.relevanceScore || 'N/A'}%</div>
          </div>
        </div>
      `;
    });
    html += `</div></div>`;

    // Footer
    html += `
      <div class="footer">
        <div style="font-weight: 700; color: #111827; margin-bottom: 2mm;">— END OF REPORT —</div>
        <div>Generated by RadarX Autonomous Intelligence Engine</div>
        <div>${dateStr}</div>
        <div>All citations traceable to primary source providers (Crossref, USPTO, NewsAPI, Web)</div>
        <div style="margin-top: 4mm; font-size: 9px;">This report contains strategic intelligence assessments. Distribution limited to authorized personnel.</div>
      </div>
    `;

    return html;
  };

  const handleDownloadMarkdown = () => {
    const dateStr = new Date(brief.generatedAt || Date.now()).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const content = `# RADARX EXECUTIVE INTELLIGENCE BRIEF
Objective ID: ${brief.investigationId}
Version: v${brief.version || 1}
Date: ${new Date(brief.generatedAt || Date.now()).toLocaleString()}

## EXECUTIVE SUMMARY
${brief.executiveSummary}

## KEY FINDINGS
${(brief.keyChanges || []).map((kf: any, idx: number) => `### ${idx + 1}. ${kf.title || kf.description?.slice(0, 100) || 'Key Finding'} (${kf.impact || 'HIGH'} IMPACT, ${kf.confidence || 85}% CONFIDENCE)\n${kf.description || kf.title}`).join('\n\n')}

## STRATEGIC IMPLICATIONS
${(brief.strategicImplications || []).map((i: any) => `- **${i.topic}**: ${i.implication}`).join('\n')}

## THREAT MATRIX
${(brief.threats || []).map((t: any) => `- **${t.title}** (Impact: ${t.impact || 'HIGH'}): ${t.description}`).join('\n')}

## OPPORTUNITY MATRIX
${(brief.opportunities || []).map((o: any) => `- **${o.title}** (Potential: ${o.potentialImpact || 'HIGH'}): ${o.description}`).join('\n')}

## RECOMMENDED ACTIONS
${(brief.recommendedActions || []).map((r: any) => `- [${r.priority}] **${r.action}**: ${r.reason} (Horizon: ${r.timeHorizon || 'IMMEDIATE'})`).join('\n')}

## PRIMARY EVIDENCE SOURCES (${evidence.length} ITEMS)
${evidence.map((e, idx) => `[${idx + 1}] ${e.title} (${e.sourceType})\n    Source: ${e.source}\n    URL: ${e.url || 'N/A'}\n    Date: ${e.publishedAt ? new Date(e.publishedAt).toLocaleDateString() : 'N/A'}\n    Relevance: ${e.relevanceScore || 'N/A'}%`).join('\n\n')}

---
Generated by RadarX Autonomous Intelligence Engine
${dateStr}
All citations traceable to primary source providers.
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RadarX_Executive_Brief_${brief.investigationId}_v${brief.version || 1}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'capturing': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'generating': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success': return <CheckCircle2 className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Printer className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'capturing': return 'CAPTURING...';
      case 'generating': return 'GENERATING PDF...';
      case 'success': return 'EXPORTED!';
      case 'error': return 'FAILED - RETRY';
      default: return 'EXPORT PDF REPORT';
    }
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      <motion.button
        whileHover={{ scale: exporting ? 1 : 1.02 }}
        whileTap={{ scale: exporting ? 1 : 0.98 }}
        onClick={handleExportPdf}
        disabled={exporting}
        className={`inline-flex items-center gap-2 font-mono text-xs font-extrabold px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer ${
          exporting
            ? 'bg-[#8C6D13] text-white cursor-wait'
            : status === 'success'
            ? 'bg-[#059669] text-white'
            : status === 'error'
            ? 'bg-[#DC2626] text-white'
            : 'bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] hover:shadow-lg'
        }`}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleDownloadMarkdown}
        className="inline-flex items-center gap-2 bg-white text-[#374151] hover:text-[#111827] font-mono text-xs font-bold px-4 py-2 rounded-xl border border-[#E5E7EB] hover:border-[#D4AF37]/50 shadow-xs transition-all cursor-pointer"
      >
        <Download className="w-4 h-4 text-[#8C6D13]" />
        <span>DOWNLOAD BRIEF (.MD)</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handlePrintPdf}
        className="inline-flex items-center gap-2 bg-white text-[#374151] hover:text-[#111827] font-mono text-xs font-bold px-4 py-2 rounded-xl border border-[#E5E7EB] hover:border-[#D4AF37]/50 shadow-xs transition-all cursor-pointer"
        title="Print via browser (Ctrl+P)"
      >
        <FileText className="w-4 h-4 text-[#6B7280]" />
        <span className="hidden sm:inline">PRINT</span>
      </motion.button>
    </div>
  );
}

export default PdfExportButton;
