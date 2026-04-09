import fs from 'node:fs';

export interface StoryEntry {
  author: string;
  date: string;
  content: string;
  index: number;
}

export function getStoryPath(photoAbsolutePath: string): string {
  return photoAbsolutePath + '.story.md';
}

export function readStory(photoAbsolutePath: string): StoryEntry[] {
  const storyPath = getStoryPath(photoAbsolutePath);
  if (!fs.existsSync(storyPath)) return [];

  const text = fs.readFileSync(storyPath, 'utf-8');
  return parseStoryFile(text);
}

function parseStoryFile(text: string): StoryEntry[] {
  const entries: StoryEntry[] = [];

  // Skip frontmatter
  let body = text;
  if (body.startsWith('---')) {
    const endIndex = body.indexOf('---', 3);
    if (endIndex !== -1) {
      body = body.slice(endIndex + 3).trim();
    }
  }

  // Split by ## headings
  const sections = body.split(/^## /m).filter(Boolean);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    const firstNewline = section.indexOf('\n');
    if (firstNewline === -1) continue;

    const heading = section.slice(0, firstNewline).trim();
    const content = section.slice(firstNewline + 1).trim();

    // Parse "Author — Date" or "Author - Date"
    const match = heading.match(/^(.+?)\s*[—\-–]\s*(.+)$/);
    if (match) {
      entries.push({
        author: match[1].trim(),
        date: match[2].trim(),
        content,
        index: i,
      });
    } else {
      entries.push({
        author: heading,
        date: '',
        content,
        index: i,
      });
    }
  }

  return entries;
}

export function appendStory(
  photoAbsolutePath: string,
  photoFilename: string,
  author: string,
  content: string,
): void {
  const storyPath = getStoryPath(photoAbsolutePath);
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  let existing = '';
  if (fs.existsSync(storyPath)) {
    existing = fs.readFileSync(storyPath, 'utf-8');
  } else {
    existing = `---\nphoto: ${photoFilename}\n---\n`;
  }

  const entry = `\n\n## ${author} — ${date}\n\n${content.trim()}\n`;
  fs.writeFileSync(storyPath, existing.trimEnd() + entry, 'utf-8');
}

export function editStory(
  photoAbsolutePath: string,
  entryIndex: number,
  newContent: string,
): boolean {
  const entries = readStory(photoAbsolutePath);
  if (entryIndex < 0 || entryIndex >= entries.length) return false;

  entries[entryIndex].content = newContent.trim();
  rewriteStoryFile(photoAbsolutePath, entries);
  return true;
}

export function deleteStory(
  photoAbsolutePath: string,
  entryIndex: number,
): boolean {
  const entries = readStory(photoAbsolutePath);
  if (entryIndex < 0 || entryIndex >= entries.length) return false;

  entries.splice(entryIndex, 1);
  rewriteStoryFile(photoAbsolutePath, entries);
  return true;
}

function rewriteStoryFile(photoAbsolutePath: string, entries: StoryEntry[]): void {
  const storyPath = getStoryPath(photoAbsolutePath);

  // Read frontmatter if exists
  let frontmatter = '';
  if (fs.existsSync(storyPath)) {
    const text = fs.readFileSync(storyPath, 'utf-8');
    if (text.startsWith('---')) {
      const endIndex = text.indexOf('---', 3);
      if (endIndex !== -1) {
        frontmatter = text.slice(0, endIndex + 3);
      }
    }
  }

  if (!frontmatter) {
    const filename = photoAbsolutePath.split('/').pop() || '';
    frontmatter = `---\nphoto: ${filename}\n---`;
  }

  if (entries.length === 0) {
    fs.unlinkSync(storyPath);
    return;
  }

  let content = frontmatter + '\n';
  for (const entry of entries) {
    const heading = entry.date ? `${entry.author} — ${entry.date}` : entry.author;
    content += `\n## ${heading}\n\n${entry.content}\n`;
  }

  fs.writeFileSync(storyPath, content, 'utf-8');
}
