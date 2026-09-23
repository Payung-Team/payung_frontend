import type { ReactNode } from 'react';

/**
 * ตัวแสดง Markdown แบบเล็ก — ใช้กับประกาศความเป็นส่วนตัว (PYG-540)
 *
 * ★ ทำไมไม่ลง react-markdown: ประกาศใช้ Markdown แค่ไม่กี่แบบ (หัวข้อ, ย่อหน้า, รายการ,
 *   ตัวหนา, เส้นคั่น, กล่องอ้างอิง, ตาราง) เขียนเองร้อยกว่าบรรทัดคุ้มกว่าเพิ่ม dependency 2 ตัว
 *   (react-markdown + remark-gfm) ที่ต้องดูแลเวอร์ชันกันไปตลอด
 *
 * ★ ปลอดภัยจาก XSS: สร้างเป็น React element ทั้งหมด ไม่มี dangerouslySetInnerHTML
 *   ข้อความทุกตัวถูก React escape ให้เอง ต่อให้ในไฟล์มี <script> ก็แสดงเป็นตัวอักษรเฉย ๆ
 *
 * ไม่รองรับ (ประกาศไม่ได้ใช้): ลิงก์, รูป, โค้ด, ตัวเอียง, รายการซ้อนหลายชั้น
 * ถ้าวันหนึ่งประกาศเริ่มใช้ของพวกนี้ ค่อยพิจารณาลง react-markdown แทน
 */

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'hr' }
  | { kind: 'quote'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] };

const HR = /^\s*-{3,}\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const UL_ITEM = /^\s*[-*]\s+(.*)$/;
const OL_ITEM = /^\s*\d+[.)]\s+(.*)$/;
/** แถวคั่นหัวตาราง เช่น "| --- | :---: |" */
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

/** "| a | b |" → ['a', 'b'] (ตัดช่องว่างหัวท้ายที่เกิดจาก | ขอบนอก) */
function splitRow(line: string): string[] {
  const cells = line.trim().split('|').map((c) => c.trim());
  if (cells[0] === '') cells.shift();
  if (cells[cells.length - 1] === '') cells.pop();
  return cells;
}

/** แปลงข้อความทั้งก้อนเป็นรายการ block — ไล่ทีละบรรทัด ไม่ใช้ regex ข้ามบรรทัด */
function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }
    if (HR.test(line)) {
      flushParagraph();
      blocks.push({ kind: 'hr' });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() });
      continue;
    }

    // ตาราง = บรรทัดที่มี | ตามด้วยบรรทัดคั่น --- (แบบ GFM)
    // ★ บรรทัดคั่นต้องมี | ด้วย ไม่งั้น "---" (เส้นคั่นธรรมดา) ใต้บรรทัดที่บังเอิญมี | จะกลายเป็นตาราง
    const next = lines[i + 1] ?? '';
    if (line.includes('|') && next.includes('|') && TABLE_SEPARATOR.test(next)) {
      flushParagraph();
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2; // ข้ามหัวตาราง + บรรทัดคั่น
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--; // for-loop จะ i++ ให้เอง
      blocks.push({ kind: 'table', header, rows });
      continue;
    }

    if (QUOTE.test(line)) {
      flushParagraph();
      const parts: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        parts.push((QUOTE.exec(lines[i]) as RegExpExecArray)[1]);
        i++;
      }
      i--;
      blocks.push({ kind: 'quote', text: parts.join(' ') });
      continue;
    }

    const listKind = UL_ITEM.test(line) ? 'ul' : OL_ITEM.test(line) ? 'ol' : null;
    if (listKind) {
      flushParagraph();
      const pattern = listKind === 'ul' ? UL_ITEM : OL_ITEM;
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i])) {
        items.push((pattern.exec(lines[i]) as RegExpExecArray)[1]);
        i++;
      }
      i--;
      blocks.push({ kind: listKind, items });
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return blocks;
}

/** **ตัวหนา** ภายในบรรทัด — อย่างอื่นแสดงเป็นข้อความธรรมดา */
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-semibold text-[#1A1A1A]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

const HEADING_CLASS: Record<number, string> = {
  1: 'text-xl font-bold text-[#064E3B]',
  2: 'mt-2 text-lg font-bold text-[#064E3B]',
  3: 'text-base font-semibold text-[#1A1A1A]',
};

export function SimpleMarkdown({ source }: { source: string }) {
  const blocks = parseMarkdown(source);

  return (
    <div className="space-y-3 text-[15px] leading-7 text-[#374151]">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'heading': {
            const className = HEADING_CLASS[block.level] ?? HEADING_CLASS[3];
            // h1 ของไฟล์ = หัวเรื่องของประกาศ → ใช้ h3 ขึ้นไปในหน้า เพื่อไม่ชนกับ h1 ของหน้าเว็บ
            if (block.level <= 1) return <h3 key={i} className={className}>{renderInline(block.text)}</h3>;
            if (block.level === 2) return <h4 key={i} className={className}>{renderInline(block.text)}</h4>;
            return <h5 key={i} className={className}>{renderInline(block.text)}</h5>;
          }
          case 'paragraph':
            return <p key={i}>{renderInline(block.text)}</p>;
          case 'hr':
            return <hr key={i} className="my-4 border-[#E5E7EB]" />;
          case 'quote':
            return (
              <blockquote
                key={i}
                className="rounded-r-lg border-l-4 border-[#52B69A] bg-[#F0FDF9] px-4 py-2 text-[#065F46]"
              >
                {renderInline(block.text)}
              </blockquote>
            );
          case 'ul':
            return (
              <ul key={i} className="list-disc space-y-1 pl-6">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="list-decimal space-y-1 pl-6">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          case 'table':
            // ตารางกว้างกว่าจอมือถือได้ → เลื่อนแนวนอนเฉพาะตาราง ไม่ให้ทั้งหน้าเลื่อน
            return (
              <div key={i} className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      {block.header.map((cell, j) => (
                        <th key={j} scope="col" className="border-b border-[#E5E7EB] px-3 py-2 font-semibold text-[#1A1A1A]">
                          {renderInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r} className="border-b border-[#F3F4F6] last:border-b-0">
                        {row.map((cell, c) => (
                          <td key={c} className="px-3 py-2 align-top">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
