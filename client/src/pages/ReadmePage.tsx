import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FolderOpen, Image, Search, Activity, Settings, Keyboard, Star, FileImage, Heart, Bell, Calendar, Users } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.js';

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{
        fontSize: 18,
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--text-primary)',
      }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        {title}
      </h2>
      <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
        {children}
      </div>
    </section>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', gap: 4, minWidth: 120 }}>
        {keys.map(k => (
          <kbd key={k} style={{
            display: 'inline-block',
            padding: '2px 8px',
            background: 'var(--bg-tertiary)',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'monospace',
            color: 'var(--text-primary)',
            fontWeight: 600,
          }}>{k}</kbd>
        ))}
      </div>
      <span>{description}</span>
    </div>
  );
}

function FormatRow({ ext, support, note }: { ext: string; support: string; note: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '6px 0', borderBottom: '1px solid var(--glass-border)', fontSize: 13 }}>
      <code style={{ minWidth: 80, fontWeight: 600, color: 'var(--text-primary)' }}>{ext}</code>
      <span style={{ minWidth: 100, color: 'var(--accent)' }}>{support}</span>
      <span style={{ color: 'var(--text-muted)' }}>{note}</span>
    </div>
  );
}

export function ReadmePage() {
  const navigate = useNavigate();
  const goBack = () => navigate(-1 as any);
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button
            className="btn btn-primary"
            onClick={goBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 14 }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <BookOpen size={28} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.03em' }}>
            Photo Viewer — User Guide
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
          A self-hosted photo browser for viewing and annotating your photo library.
          Photos live on your filesystem; the app reads and indexes them without moving or modifying the originals.
          Metadata (titles, captions, dates) is saved to XMP sidecar files alongside each photo.
        </p>
      </div>

      {/* Library */}
      <Section icon={<FolderOpen size={20} />} title="Library">
        <p style={{ marginBottom: 8 }}>
          The <strong style={{ color: 'var(--text-primary)' }}>Library</strong> is the home screen.
          It shows all top-level folders in your photos directory, each with a cover thumbnail and photo count.
        </p>
        <ul style={{ marginLeft: 16, marginTop: 8 }}>
          <li style={{ marginBottom: 4 }}>Click a folder to open its <strong style={{ color: 'var(--text-primary)' }}>Gallery</strong>.</li>
          <li style={{ marginBottom: 4 }}>Use <strong style={{ color: 'var(--text-primary)' }}>Sort</strong> (top right) to order folders by name or date.</li>
          <li style={{ marginBottom: 4 }}>Click <strong style={{ color: 'var(--text-primary)' }}>Index</strong> to scan for new or changed photos.</li>
          <li>Subfolders appear as nested folder cards within the Gallery.</li>
        </ul>
      </Section>

      {/* Gallery */}
      <Section icon={<Image size={20} />} title="Gallery">
        <p style={{ marginBottom: 8 }}>
          The <strong style={{ color: 'var(--text-primary)' }}>Gallery</strong> shows all photos in a folder as a scrollable grid.
          Large folders use virtual scrolling — only visible rows are rendered, keeping the app fast with hundreds of photos.
        </p>
        <ul style={{ marginLeft: 16, marginTop: 8 }}>
          <li style={{ marginBottom: 4 }}>Click any photo to open it in the <strong style={{ color: 'var(--text-primary)' }}>Viewer</strong>.</li>
          <li style={{ marginBottom: 4 }}>Each card shows the filename. If a title has been set, it appears below the filename.</li>
          <li>Sort the gallery by Name, Date, <em>Timeline</em> (chronological with year/decade markers, undated at end), or <em>Needs Annotation</em>.</li>
        </ul>
      </Section>

      {/* Viewer */}
      <Section icon={<Star size={20} />} title="Viewer">
        <p style={{ marginBottom: 12 }}>
          The <strong style={{ color: 'var(--text-primary)' }}>Viewer</strong> displays a single photo full-screen with a thumbnail strip at the bottom for quick navigation.
        </p>

        <p style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-primary)' }}>Toolbar</p>
        <ul style={{ marginLeft: 16, marginBottom: 12 }}>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--text-primary)' }}>▶ Play</strong> — Start a slideshow. Choose an interval (2s, 5s, 10s, 15s, 30s) and whether it loops or stops at the last photo.</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--text-primary)' }}>↓ Download</strong> — Download the original file.</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--text-primary)' }}>i Info</strong> — Toggle the metadata panel on the right side.</li>
        </ul>

        <p style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-primary)' }}>Fullscreen</p>
        <p>Click the fullscreen icon (between the image and thumbnail strip) to enter browser fullscreen. Controls auto-hide after 3 seconds and reappear on mouse movement.</p>
      </Section>

      {/* Metadata */}
      <Section icon={<FileImage size={20} />} title="Metadata & Stories">
        <p style={{ marginBottom: 8 }}>
          Open the <strong style={{ color: 'var(--text-primary)' }}>Info panel</strong> (i button) to view and edit photo metadata.
          All changes are written to XMP sidecar files alongside the original — the originals are never modified.
        </p>

        <p style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-primary)' }}>Editable fields</p>
        <ul style={{ marginLeft: 16, marginBottom: 12 }}>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--text-primary)' }}>Title</strong> — Displayed in the Viewer header. Click to edit, press Enter or click away to save.</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--text-primary)' }}>Caption</strong> — Shown below the image in the Viewer. Appears in search results.</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Date Taken</strong> — Overrides the EXIF date if set.</li>
        </ul>

        <p style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-primary)' }}>Stories</p>
        <p>
          Stories are longer narrative entries attached to a photo. Each entry has an author and a date stamp.
          Stories are saved to <code style={{ fontSize: 12 }}>.story.md</code> sidecar files. Multiple stories can be added per photo.
          Press <kbd style={{ padding: '1px 6px', background: 'var(--bg-tertiary)', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>⌘ Enter</kbd> to save a story while typing.
        </p>
      </Section>

      {/* Reactions & Comments */}
      <Section icon={<Heart size={20} />} title="Reactions & Comments">
        <p style={{ marginBottom: 8 }}>
          React to any photo with ❤️ 😂 😢 😮 🙏 👏. Reactions are attributed — hover a count to see who reacted.
        </p>
        <p>
          Comments are threaded one level deep. Tap <strong style={{ color: 'var(--text-primary)' }}>Reply</strong> under any top-level comment to respond. You can delete your own comments; admins can delete any.
        </p>
      </Section>

      {/* Following & Notifications */}
      <Section icon={<Bell size={20} />} title="Following & Notifications">
        <p style={{ marginBottom: 8 }}>
          Click the bell icon in the Info panel to <strong style={{ color: 'var(--text-primary)' }}>follow</strong> a photo. You'll be notified when others react, comment, tag, or edit its metadata. Adding any content auto-follows.
        </p>
        <p>
          The <strong style={{ color: 'var(--text-primary)' }}>bell</strong> in the top nav shows unread count. Click a notification to jump to the photo. Polls every 30 seconds.
        </p>
      </Section>

      {/* On This Day */}
      <Section icon={<Calendar size={20} />} title="On This Day">
        <p>
          The Library page shows a banner of photos from today's date in previous years. Click × to dismiss for the rest of the day. Uses your user-set date; falls back to EXIF.
        </p>
      </Section>

      {/* People & Places */}
      <Section icon={<Users size={20} />} title="People & Places">
        <p style={{ marginBottom: 8 }}>
          Tag people in a photo from the Info panel — start typing a name and pick from suggestions, or create a new tag inline. No limit per photo.
        </p>
        <p>
          Add a free-text <strong style={{ color: 'var(--text-primary)' }}>Location</strong> to any photo. Stored in the database (not XMP).
        </p>
      </Section>

      {/* Search */}
      <Section icon={<Search size={20} />} title="Search">
        <p style={{ marginBottom: 8 }}>
          Click <strong style={{ color: 'var(--text-primary)' }}>Search</strong> in the top nav to search across your entire library.
          Full-text search covers titles, captions, story text, folder names, and filenames.
        </p>
        <ul style={{ marginLeft: 16 }}>
          <li style={{ marginBottom: 4 }}>Filter by <strong style={{ color: 'var(--text-primary)' }}>date range</strong> using the date pickers.</li>
          <li style={{ marginBottom: 4 }}>Filter to show only <strong style={{ color: 'var(--text-primary)' }}>annotated</strong> (has title or caption) or <strong style={{ color: 'var(--text-primary)' }}>unannotated</strong> photos.</li>
          <li>Click any result to open it in the Viewer.</li>
        </ul>
      </Section>

      {/* Activity */}
      <Section icon={<Activity size={20} />} title="Activity">
        <p style={{ marginBottom: 8 }}>
          The <strong style={{ color: 'var(--text-primary)' }}>Activity</strong> feed (⚡ icon in the top nav) shows a log of all metadata edits across the library — who added a title, caption, story, or date, and when.
        </p>
        <p>
          It also shows overall <strong style={{ color: 'var(--text-primary)' }}>annotation progress</strong>: how many photos across the library have titles and captions, displayed as a progress bar per folder.
        </p>
      </Section>

      {/* Settings */}
      <Section icon={<Settings size={20} />} title="Settings (Admin only)">
        <p style={{ marginBottom: 8 }}>
          Accessible via the gear icon in the top nav. Only admin users can see this page.
        </p>
        <ul style={{ marginLeft: 16 }}>
          <li style={{ marginBottom: 4 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Invite User</strong> — Enter an email address and click Invite. Copy the generated link and send it to the new user. They click the link to create their account.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Users</strong> — View all accounts. Revoke access to remove a user. Regenerate an invite link if needed.
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>Storage Location</strong> — The path to your photos directory. Use Browse to navigate the filesystem, then click Update. Re-index after changing the path.
          </li>
        </ul>
      </Section>

      {/* Keyboard shortcuts */}
      <Section icon={<Keyboard size={20} />} title="Keyboard Shortcuts">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <ShortcutRow keys={['←', '→']} description="Previous / Next photo in Viewer" />
          <ShortcutRow keys={['Esc']} description="Return to Gallery from Viewer" />
          <ShortcutRow keys={['I']} description="Toggle Info panel" />
          <ShortcutRow keys={['⌘', 'Enter']} description="Save story while typing" />
        </div>
      </Section>

      {/* Format support */}
      <Section icon={<FileImage size={20} />} title="Supported File Formats">
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
          <FormatRow ext="JPEG / JPG" support="Full" note="Thumbnail, preview, EXIF metadata" />
          <FormatRow ext="PNG" support="Full" note="Thumbnail, preview" />
          <FormatRow ext="TIFF / TIF" support="Full" note="Thumbnail, preview" />
          <FormatRow ext="NEF" support="Full" note="Nikon RAW — embedded JPEG extracted" />
          <FormatRow ext="CR2 / CR3" support="Full" note="Canon RAW — embedded JPEG extracted" />
          <FormatRow ext="ARW" support="Full" note="Sony RAW — embedded JPEG extracted" />
          <FormatRow ext="RAF" support="Full" note="Fujifilm RAW — embedded JPEG extracted" />
          <FormatRow ext="ORF" support="Full" note="Olympus RAW — embedded JPEG extracted" />
          <FormatRow ext="RW2" support="Full" note="Panasonic RAW — embedded JPEG extracted" />
          <FormatRow ext="DNG" support="Full" note="Adobe DNG — processed via sharp (best subIFD)" />
          <FormatRow ext="PSD" support="Full" note="Photoshop — via sips or qlmanage (macOS)" />
          <FormatRow ext="PSB" support="Full" note="Photoshop Large — via ImageMagick (generated at index time)" />
        </div>
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          PSB previews are generated during indexing and may take a moment for large files. All other formats generate thumbnails and previews on first view and are cached for instant loading thereafter.
        </p>
      </Section>
    </div>
  );
}
