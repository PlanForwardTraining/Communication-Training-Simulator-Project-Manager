import type { ReactNode } from 'react';

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Match **bold** OR *italic*. Bold must come first so we don't greedily catch the
  // outer asterisks of **bold** as italics. Quotes inside italics (*"..."*) are common.
  const regex = /\*\*(.+?)\*\*|\*([^*\n]+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      parts.push(
        <strong key={`b${key++}`} className="font-semibold text-slate-text">
          {match[1]}
        </strong>,
      );
    } else {
      parts.push(
        <em key={`i${key++}`} className="italic text-slate-text/90">
          {match[2]}
        </em>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function MarkdownLite({ source }: { source: string }) {
  const lines = source.split('\n');
  const elements: ReactNode[] = [];
  let key = 0;
  let para: string[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushPara = () => {
    if (para.length === 0) return;
    elements.push(
      <p
        key={`p${key++}`}
        className="font-body text-sm text-slate-muted leading-relaxed mb-3"
      >
        {renderInline(para.join(' '))}
      </p>,
    );
    para = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    const cls =
      'font-body text-sm text-slate-muted leading-relaxed mb-3 pl-5 space-y-1.5 ' +
      (listType === 'ol' ? 'list-decimal' : 'list-disc');
    elements.push(
      listType === 'ol' ? (
        <ol key={`l${key++}`} className={cls}>
          {listItems.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ol>
      ) : (
        <ul key={`l${key++}`} className={cls}>
          {listItems.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ul>
      ),
    );
    listItems = [];
    listType = null;
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (line === '') {
      flushPara();
      flushList();
      continue;
    }

    // Skip h1 — title is shown elsewhere in the page header
    if (line.startsWith('# ')) {
      flushPara();
      flushList();
      continue;
    }

    if (line.startsWith('## ')) {
      flushPara();
      flushList();
      elements.push(
        <h3
          key={`h${key++}`}
          className="font-display font-semibold text-xs text-gold-500 uppercase tracking-widest mt-5 mb-2 first:mt-0"
        >
          {line.slice(3)}
        </h3>,
      );
      continue;
    }

    if (line.startsWith('### ')) {
      flushPara();
      flushList();
      elements.push(
        <h4
          key={`h${key++}`}
          className="font-display font-semibold text-sm text-slate-text mt-4 mb-2"
        >
          {renderInline(line.slice(4))}
        </h4>,
      );
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      flushPara();
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(olMatch[1]);
      continue;
    }

    if (line.startsWith('- ')) {
      flushPara();
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(line.slice(2));
      continue;
    }

    flushList();
    para.push(line);
  }

  flushPara();
  flushList();

  return <div>{elements}</div>;
}
