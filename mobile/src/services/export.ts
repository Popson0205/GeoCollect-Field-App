import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Submission, Form, ExportFormat, GPSPoint } from '../types';
import { api } from './api';

// ─── GeoJSON Builder ─────────────────────────────────────────────────────────
function submissionsToGeoJSON(submissions: Submission[], form: Form): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = submissions
    .filter((s) => s.location)
    .map((s) => {
      const loc = s.location as GPSPoint;
      const properties: Record<string, any> = {
        submission_id: s.id,
        form_title: form.title,
        submitted_by: s.submitted_by,
        submitted_at: s.submitted_at,
        geofence_status: s.geofence_status,
      };
      
      // Flatten answers into properties
      for (const [fieldId, value] of Object.entries(s.answers)) {
        const field = form.fields.find((f) => f.id === fieldId);
        const key = field?.label ?? fieldId;
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          // GPS track — skip in flat properties
        } else {
          properties[key] = value;
        }
      }

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [loc.longitude, loc.latitude, loc.altitude ?? 0],
        },
        properties,
      };
    });

  return { type: 'FeatureCollection', features };
}

// ─── CSV Builder ─────────────────────────────────────────────────────────────
function submissionsToCSV(submissions: Submission[], form: Form): string {
  const fieldLabels = form.fields
    .filter((f) => f.type !== 'gps_track' && f.type !== 'photo' && f.type !== 'signature')
    .map((f) => f.label);

  const headers = [
    'submission_id', 'submitted_at', 'submitted_by',
    'latitude', 'longitude', 'altitude', 'gps_accuracy',
    'geofence_status',
    ...fieldLabels,
  ];

  const rows = submissions.map((s) => {
    const loc = s.location;
    const row: (string | number | boolean | null)[] = [
      s.id, s.submitted_at, s.submitted_by,
      loc?.latitude ?? '', loc?.longitude ?? '', loc?.altitude ?? '', loc?.accuracy ?? '',
      s.geofence_status,
    ];

    for (const field of form.fields.filter((f) =>
      f.type !== 'gps_track' && f.type !== 'photo' && f.type !== 'signature'
    )) {
      const val = s.answers[field.id];
      if (Array.isArray(val)) row.push(val.join('; '));
      else row.push(val ?? '');
    }
    return row;
  });

  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
}

// ─── KML Builder ─────────────────────────────────────────────────────────────
function submissionsToKML(submissions: Submission[], form: Form): string {
  const placemarks = submissions
    .filter((s) => s.location)
    .map((s) => {
      const loc = s.location as GPSPoint;
      const desc = form.fields
        .filter((f) => f.type !== 'gps_track' && f.type !== 'photo')
        .map((f) => {
          const val = s.answers[f.id];
          return `<Data name="${f.label}"><value>${val ?? ''}</value></Data>`;
        })
        .join('\n');

      return `
    <Placemark>
      <name>${form.title} — ${s.submitted_at.split('T')[0]}</name>
      <description><![CDATA[Submitted: ${s.submitted_at}]]></description>
      <ExtendedData>${desc}</ExtendedData>
      <Point>
        <coordinates>${loc.longitude},${loc.latitude},${loc.altitude ?? 0}</coordinates>
      </Point>
    </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${form.title}</name>
    ${placemarks}
  </Document>
</kml>`;
}

// ─── DXF Builder (basic point DXF) ───────────────────────────────────────────
function submissionsToDXF(submissions: Submission[], form: Form): string {
  const points = submissions
    .filter((s) => s.location)
    .map((s) => {
      const loc = s.location as GPSPoint;
      return `  0\nPOINT\n  8\nGeoCollect\n 10\n${loc.longitude}\n 20\n${loc.latitude}\n 30\n${loc.altitude ?? 0}`;
    })
    .join('\n');

  return `  0\nSECTION\n  2\nHEADER\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES\n${points}\n  0\nENDSEC\n  0\nEOF`;
}

// ─── Main Export Function ─────────────────────────────────────────────────────
export async function exportSubmissions(
  submissions: Submission[],
  form: Form,
  format: ExportFormat
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseFilename = `${form.title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}`;

  let content: string;
  let filename: string;
  let mimeType: string;

  switch (format) {
    case 'geojson': {
      content = JSON.stringify(submissionsToGeoJSON(submissions, form), null, 2);
      filename = `${baseFilename}.geojson`;
      mimeType = 'application/geo+json';
      break;
    }
    case 'csv': {
      content = submissionsToCSV(submissions, form);
      filename = `${baseFilename}.csv`;
      mimeType = 'text/csv';
      break;
    }
    case 'kml': {
      content = submissionsToKML(submissions, form);
      filename = `${baseFilename}.kml`;
      mimeType = 'application/vnd.google-earth.kml+xml';
      break;
    }
    case 'json': {
      content = JSON.stringify(submissions, null, 2);
      filename = `${baseFilename}.json`;
      mimeType = 'application/json';
      break;
    }
    case 'dxf': {
      // Try server-side DXF first, fall back to basic on-device
      try {
        const geojson = submissionsToGeoJSON(submissions, form);
        content = await api.exportToDXF(geojson);
      } catch {
        content = submissionsToDXF(submissions, form);
      }
      filename = `${baseFilename}.dxf`;
      mimeType = 'application/dxf';
      break;
    }
    case 'shapefile': {
      // Shapefile must go via server (GDAL)
      const geojson = submissionsToGeoJSON(submissions, form);
      const buffer = await api.exportToShapefile(geojson);
      const path = `${FileSystem.documentDirectory}${baseFilename}.zip`;
      const base64 = Buffer.from(buffer).toString('base64');
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(path, { mimeType: 'application/zip', dialogTitle: 'Export Shapefile' });
      return;
    }
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, { mimeType, dialogTitle: `Export ${format.toUpperCase()}` });
}
