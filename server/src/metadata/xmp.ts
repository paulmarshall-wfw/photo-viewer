import fs from 'node:fs';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const XMP_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
      xmlns:exif="http://ns.adobe.com/exif/1.0/"
      xmlns:pv="http://photoviewer.local/ns/1.0/">
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;

export interface XmpMetadata {
  title: string | null;
  caption: string | null;
  dateTaken: string | null;
  titleEditedBy: string | null;
  titleEditedAt: string | null;
  captionEditedBy: string | null;
  captionEditedAt: string | null;
  dateEditedBy: string | null;
  dateEditedAt: string | null;
}

export function getXmpPath(photoAbsolutePath: string): string {
  return photoAbsolutePath + '.xmp';
}

export function readXmp(photoAbsolutePath: string): XmpMetadata {
  const xmpPath = getXmpPath(photoAbsolutePath);
  const empty: XmpMetadata = {
    title: null, caption: null, dateTaken: null,
    titleEditedBy: null, titleEditedAt: null,
    captionEditedBy: null, captionEditedAt: null,
    dateEditedBy: null, dateEditedAt: null,
  };

  if (!fs.existsSync(xmpPath)) return empty;

  try {
    const xml = fs.readFileSync(xmpPath, 'utf-8');
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xml);

    const desc = parsed?.['x:xmpmeta']?.['rdf:RDF']?.['rdf:Description'];
    if (!desc) return empty;

    // dc:title can be a string or an rdf:Alt structure
    let title = null;
    const dcTitle = desc['dc:title'];
    if (typeof dcTitle === 'string') {
      title = dcTitle;
    } else if (dcTitle?.['rdf:Alt']?.['rdf:li']) {
      const li = dcTitle['rdf:Alt']['rdf:li'];
      title = typeof li === 'string' ? li : (li?.['#text'] ?? null);
    }

    let caption = null;
    const dcDesc = desc['dc:description'];
    if (typeof dcDesc === 'string') {
      caption = dcDesc;
    } else if (dcDesc?.['rdf:Alt']?.['rdf:li']) {
      const li = dcDesc['rdf:Alt']['rdf:li'];
      caption = typeof li === 'string' ? li : (li?.['#text'] ?? null);
    }

    return {
      title,
      caption,
      dateTaken: desc['photoshop:DateCreated'] ?? null,
      titleEditedBy: desc['pv:titleEditedBy'] ?? null,
      titleEditedAt: desc['pv:titleEditedAt'] ?? null,
      captionEditedBy: desc['pv:captionEditedBy'] ?? null,
      captionEditedAt: desc['pv:captionEditedAt'] ?? null,
      dateEditedBy: desc['pv:dateEditedBy'] ?? null,
      dateEditedAt: desc['pv:dateEditedAt'] ?? null,
    };
  } catch {
    return empty;
  }
}

export function writeXmpField(
  photoAbsolutePath: string,
  field: 'title' | 'caption' | 'dateTaken',
  value: string,
  editedBy: string,
): void {
  const xmpPath = getXmpPath(photoAbsolutePath);
  const now = new Date().toISOString();

  let xml: string;
  if (fs.existsSync(xmpPath)) {
    xml = fs.readFileSync(xmpPath, 'utf-8');
  } else {
    xml = XMP_TEMPLATE;
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    preserveOrder: false,
  });
  const parsed = parser.parse(xml);

  // Navigate to rdf:Description
  if (!parsed['x:xmpmeta']) parsed['x:xmpmeta'] = {};
  if (!parsed['x:xmpmeta']['rdf:RDF']) parsed['x:xmpmeta']['rdf:RDF'] = {};
  if (!parsed['x:xmpmeta']['rdf:RDF']['rdf:Description']) {
    parsed['x:xmpmeta']['rdf:RDF']['rdf:Description'] = {};
  }

  const desc = parsed['x:xmpmeta']['rdf:RDF']['rdf:Description'];

  // Ensure namespaces
  desc['@_xmlns:dc'] = 'http://purl.org/dc/elements/1.1/';
  desc['@_xmlns:photoshop'] = 'http://ns.adobe.com/photoshop/1.0/';
  desc['@_xmlns:pv'] = 'http://photoviewer.local/ns/1.0/';
  desc['@_xmlns:rdf'] = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

  switch (field) {
    case 'title':
      desc['dc:title'] = { 'rdf:Alt': { 'rdf:li': { '@_xml:lang': 'x-default', '#text': value } } };
      desc['pv:titleEditedBy'] = editedBy;
      desc['pv:titleEditedAt'] = now;
      break;
    case 'caption':
      desc['dc:description'] = { 'rdf:Alt': { 'rdf:li': { '@_xml:lang': 'x-default', '#text': value } } };
      desc['pv:captionEditedBy'] = editedBy;
      desc['pv:captionEditedAt'] = now;
      break;
    case 'dateTaken':
      desc['photoshop:DateCreated'] = value;
      desc['pv:dateEditedBy'] = editedBy;
      desc['pv:dateEditedAt'] = now;
      break;
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    suppressEmptyNode: false,
  });

  let newXml = builder.build(parsed);
  // Remove any duplicate XML declarations
  newXml = newXml.replace(/<\?xml[^?]*\?>\s*/g, '');
  newXml = '<?xml version="1.0" encoding="UTF-8"?>\n' + newXml;
  fs.writeFileSync(xmpPath, newXml, 'utf-8');
}
