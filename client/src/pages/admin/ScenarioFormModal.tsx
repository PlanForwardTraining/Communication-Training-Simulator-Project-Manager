import { useEffect, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { scenariosApi, type ScenarioFull } from '../../api/scenarios';

const BRIEF_END_MARKER = '<!-- BRIEF END -->';

// We render the BRIEF END marker as a horizontal rule in the editor (TipTap's
// built-in HorizontalRule node). On save, replace each <hr> in the serialized
// markdown with the literal HTML comment marker. On load, the inverse swap.
function markdownToEditorSource(md: string): string {
  // Replace the marker with a horizontal rule so TipTap can render + preserve it
  return md.replace(/<!--\s*BRIEF END\s*-->/gi, '\n\n---\n\n');
}

function editorMarkdownToStorage(md: string): string {
  // tiptap-markdown serializes HR as "---" on its own line; restore the marker
  return md.replace(/^---\s*$/gm, BRIEF_END_MARKER);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface Props {
  mode: 'create' | 'edit';
  scenario?: ScenarioFull;
  onClose: () => void;
  onSaved: () => void;
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  const Btn = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1 rounded-md text-xs font-body font-semibold transition-colors ${
        active
          ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
          : 'text-slate-muted hover:text-slate-text border border-transparent hover:bg-navy-700'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-navy-600 bg-navy-800/60">
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Section heading"
      >
        H2
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Subsection heading"
      >
        H3
      </Btn>
      <span className="w-px h-5 bg-navy-600 mx-1" />
      <Btn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold"
      >
        <strong>B</strong>
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic"
      >
        <em>I</em>
      </Btn>
      <span className="w-px h-5 bg-navy-600 mx-1" />
      <Btn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Bulleted list"
      >
        • List
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Numbered list"
      >
        1. List
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="Quote / callout"
      >
        ❝ Quote
      </Btn>
      <span className="w-px h-5 bg-navy-600 mx-1" />
      <Btn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Insert BRIEF END divider — separates the PM brief from the answer key"
      >
        ✂ Insert BRIEF END
      </Btn>
    </div>
  );
}

export function ScenarioFormModal({ mode, scenario, onClose, onSaved }: Props) {
  const isCreate = mode === 'create';
  // Slug is hidden from the UI — non-technical owners shouldn't need to think
  // about URL-safe identifiers. In create mode it's silently derived from the
  // title; in edit mode it's read-only (DB enforces uniqueness on the original).
  const [slug, setSlug] = useState(scenario?.slug ?? '');
  const [title, setTitle] = useState(scenario?.title ?? '');
  const [description, setDescription] = useState(scenario?.description ?? '');
  const [active, setActive] = useState(scenario ? scenario.active === 1 : true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Markdown.configure({ html: false, breaks: true })],
    content: '',
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none px-4 py-3 min-h-[280px] focus:outline-none ' +
          'font-body text-sm text-slate-text leading-relaxed',
      },
    },
  });

  // Hydrate the editor with the scenario body once it mounts
  useEffect(() => {
    if (!editor) return;
    const initial = scenario?.body_markdown ?? '';
    if (initial) {
      editor.commands.setContent(markdownToEditorSource(initial));
    }
    // We deliberately only run when the editor instance changes — re-running
    // on every prop change would clobber in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Auto-derive slug from title in create mode. The field is hidden so this
  // is the only path that ever sets the slug for a new scenario.
  useEffect(() => {
    if (isCreate && title) {
      setSlug(slugify(title));
    }
  }, [title, isCreate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    setError(null);

    // Pull markdown out of the editor and swap horizontal rule → BRIEF END.
    // tiptap-markdown augments editor.storage with a `markdown` namespace at
    // runtime; TS doesn't see the augmentation, so cast through unknown.
    const md = (editor.storage as unknown as { markdown: { getMarkdown: () => string } })
      .markdown
      .getMarkdown();
    const body = editorMarkdownToStorage(md);

    if (!body.includes(BRIEF_END_MARKER)) {
      setError('Add a "BRIEF END" divider — click the ✂ Insert BRIEF END button on the toolbar. Above the divider is what the PM sees; below is for the AI client and the coach.');
      return;
    }

    setSubmitting(true);
    try {
      if (isCreate) {
        await scenariosApi.create({ slug, title, description, body_markdown: body });
      } else if (scenario) {
        await scenariosApi.update(scenario.id, {
          title,
          description,
          body_markdown: body,
          active,
        });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-xl text-slate-text">
            {isCreate ? 'New Scenario' : `Edit: ${scenario?.title}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-muted hover:text-slate-text"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <label className="block">
          <span className="font-body text-xs text-slate-muted block mb-1">Title</span>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-text font-body focus:outline-none focus:border-gold-500"
          />
        </label>

        <label className="block">
          <span className="font-body text-xs text-slate-muted block mb-1">
            Short description <span className="opacity-60">(shown on the scenario card)</span>
          </span>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-text font-body focus:outline-none focus:border-gold-500"
          />
        </label>

        <div>
          <span className="font-body text-xs text-slate-muted block mb-1">
            Scenario body
          </span>
          <p className="font-body text-xs text-slate-muted mb-2 leading-relaxed">
            Anything <span className="text-slate-text font-medium">above</span> the BRIEF END divider is shown to the PM as their case file.
            Anything <span className="text-slate-text font-medium">below</span> is the answer key — used by the AI client and the coach, never shown to the PM.
          </p>
          <div className="border border-navy-600 rounded-lg overflow-hidden bg-navy-800">
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
          </div>
        </div>

        {!isCreate && (
          <label className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              className="rounded border-navy-600 bg-navy-800 text-gold-500 focus:ring-gold-500"
            />
            <span className="font-body text-sm text-slate-text">
              Active <span className="text-slate-muted">(PMs see it on the scenario picker)</span>
            </span>
          </label>
        )}

        {error && <p className="font-body text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2 border-t border-navy-700">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Saving…' : isCreate ? 'Create scenario' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
