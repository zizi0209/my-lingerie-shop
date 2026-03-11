'use client';

import { memo, useMemo } from 'react';

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatInlineMarkdown = (escaped: string) => {
  const withInlineCode = escaped.replace(/`([^`]+)`/g, '<code class="message-inline-code">$1</code>');
  const withBold = withInlineCode.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return withBold.replace(/(^|[\s(])\*([^*]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
};

const formatPlainTextBlock = (raw: string) =>
  formatInlineMarkdown(escapeHtml(raw)).replace(/\n/g, '<br>');

const isMarkdownTableRow = (line: string) => /^\s*\|.+\|\s*$/.test(line);
const isMarkdownTableDivider = (line: string) =>
  /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);

const parseMarkdownTableCells = (line: string) =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());

const renderMarkdownTable = (headerCells: string[], bodyRows: string[][]) => {
  const headerHtml = headerCells
    .map((cell) => `<th>${formatInlineMarkdown(escapeHtml(cell))}</th>`)
    .join('');
  const bodyHtml = bodyRows
    .map((row) =>
      `<tr>${row
        .map((cell) => `<td>${formatInlineMarkdown(escapeHtml(cell))}</td>`)
        .join('')}</tr>`
    )
    .join('');
  return `<div class="message-table-wrap"><table class="message-table"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
};

const formatTextSegment = (raw: string) => {
  const lines = raw.split('\n');
  const output: string[] = [];
  const buffer: string[] = [];

  const flushPlain = () => {
    if (buffer.length === 0) return;
    output.push(formatPlainTextBlock(buffer.join('\n')));
    buffer.length = 0;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const nextLine = lines[index + 1] ?? '';

    if (isMarkdownTableRow(line) && isMarkdownTableDivider(nextLine)) {
      flushPlain();
      const headerCells = parseMarkdownTableCells(line);
      const bodyRows: string[][] = [];
      index += 1;

      while (index + 1 < lines.length) {
        const rowLine = lines[index + 1];
        if (!rowLine || !isMarkdownTableRow(rowLine)) break;
        index += 1;
        bodyRows.push(parseMarkdownTableCells(rowLine));
      }

      output.push(renderMarkdownTable(headerCells, bodyRows));
      continue;
    }

    buffer.push(line);
  }

  flushPlain();
  return output.join('');
};

const formatMessageContent = (raw: string) => {
  const codeBlockPattern = /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g;
  const chunks: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockPattern.exec(raw)) !== null) {
    const [fullBlock, languageRaw, codeRaw] = match;
    const blockStart = match.index;
    if (blockStart > lastIndex) {
      chunks.push(formatTextSegment(raw.slice(lastIndex, blockStart)));
    }

    const language = (languageRaw ?? '').trim();
    const escapedCode = escapeHtml(codeRaw ?? '');
    chunks.push(
      `<pre class="message-code"><code>${escapedCode}</code>${
        language ? `<span class="message-code-lang">${escapeHtml(language)}</span>` : ''
      }</pre>`
    );
    lastIndex = blockStart + fullBlock.length;
  }

  if (lastIndex < raw.length) {
    chunks.push(formatTextSegment(raw.slice(lastIndex)));
  }

  return chunks.length > 0 ? chunks.join('') : formatTextSegment(raw);
};

type MessageRendererProps = {
  content: string;
};

export const MessageRenderer = memo(({ content }: MessageRendererProps) => {
  const html = useMemo(() => formatMessageContent(content || ''), [content]);
  return <div className="message-body" dangerouslySetInnerHTML={{ __html: html }} />;
});

MessageRenderer.displayName = 'MessageRenderer';
