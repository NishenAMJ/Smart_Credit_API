/** @format */

import React, { type ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

type AssistantMarkdownProps = {
  content: string;
};

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

    if (unorderedListPattern.test(line)) {
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

    if (orderedListPattern.test(line)) {
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
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Text key={index} style={styles.bold}>
            {part.slice(2, -2)}
          </Text>
        );
      }

      if (part.startsWith("__") && part.endsWith("__")) {
        return (
          <Text key={index} style={styles.bold}>
            {part.slice(2, -2)}
          </Text>
        );
      }

      if (
        (part.startsWith("*") && part.endsWith("*")) ||
        (part.startsWith("_") && part.endsWith("_"))
      ) {
        return (
          <Text key={index} style={styles.italic}>
            {part.slice(1, -1)}
          </Text>
        );
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <Text key={index} style={styles.code}>
            {part.slice(1, -1)}
          </Text>
        );
      }

      return <Text key={index}>{part}</Text>;
    });
}

export default function AssistantMarkdown({ content }: AssistantMarkdownProps) {
  return (
    <View style={styles.container}>
      {parseBlocks(content).map((block, index) => {
        if (block.type === "heading") {
          return (
            <Text
              key={index}
              style={block.level <= 2 ? styles.headingLarge : styles.heading}
            >
              {renderInline(block.content)}
            </Text>
          );
        }

        if (block.type === "rule") {
          return <View key={index} style={styles.rule} />;
        }

        if (block.type === "unordered-list" || block.type === "ordered-list") {
          return (
            <View key={index} style={styles.list}>
              {block.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.listItem}>
                  <Text style={styles.listMarker}>
                    {block.type === "ordered-list" ? `${itemIndex + 1}.` : "•"}
                  </Text>
                  <Text style={styles.text}>{renderInline(item)}</Text>
                </View>
              ))}
            </View>
          );
        }

        return (
          <Text key={index} style={styles.text}>
            {renderInline(block.content)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 9 },
  text: { flexShrink: 1, color: "#26344D", fontSize: 14, lineHeight: 21 },
  headingLarge: {
    color: "#17213A",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  heading: {
    color: "#17213A",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  bold: { fontWeight: "700" },
  italic: { fontStyle: "italic" },
  code: {
    color: "#253753",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 13,
  },
  rule: { height: 1, backgroundColor: "#E0E7F0", marginVertical: 2 },
  list: { gap: 5 },
  listItem: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  listMarker: {
    minWidth: 17,
    color: "#52647D",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    textAlign: "right",
  },
});
