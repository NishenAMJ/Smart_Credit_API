import { Fragment, type ReactNode } from "react";

type AssistantMarkdownProps = { content: string };

type MarkdownBlock =
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "rule" };

const headingPattern = /^(#{1,4})\s+(.+)$/;
const unorderedListPattern = /^\s*[-*]\s+(.+)$/;
const orderedListPattern = /^\s*\d+\.\s+(.+)$/;
const rulePattern = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

function isBlockStart(line: string) {
  return (
    headingPattern.test(line) ||
    unorderedListPattern.test(line) ||
    orderedListPattern.test(line) ||
    rulePattern.test(line)
  );
}

function parseBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      index += 1;
      continue;
    }

    const heading = trimmedLine.match(headingPattern);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        content: heading[2],
      });
      index += 1;
      continue;
    }
    if (rulePattern.test(trimmedLine)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    const unorderedItem = line.match(unorderedListPattern);
    if (unorderedItem) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(unorderedListPattern);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    const orderedItem = line.match(orderedListPattern);
    if (orderedItem) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(orderedListPattern);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", content: paragraphLines.join(" ") });
  }
  return blocks;
}

function renderInline(content: string): ReactNode[] {
  return content
    .split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (
        (part.startsWith("**") && part.endsWith("**")) ||
        (part.startsWith("__") && part.endsWith("__"))
      ) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (
        (part.startsWith("*") && part.endsWith("*")) ||
        (part.startsWith("_") && part.endsWith("_"))
      ) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={index}>{part.slice(1, -1)}</code>;
      }
      return <Fragment key={index}>{part}</Fragment>;
    });
}

export default function AssistantMarkdown({ content }: AssistantMarkdownProps) {
  return (
    <div className="ai-assistant__markdown">
      {parseBlocks(content).map((block, index) => {
        if (block.type === "heading") {
          const Heading = block.level <= 2 ? "h3" : "h4";
          return <Heading key={index}>{renderInline(block.content)}</Heading>;
        }
        if (block.type === "rule") return <hr key={index} />;
        if (block.type === "unordered-list" || block.type === "ordered-list") {
          const List = block.type === "ordered-list" ? "ol" : "ul";
          return (
            <List key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </List>
          );
        }
        return <p key={index}>{renderInline(block.content)}</p>;
      })}
    </div>
  );
}
