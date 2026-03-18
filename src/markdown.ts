import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";

const parser = unified().use(remarkParse);
const serializer = unified().use(remarkStringify, {
  bullet: "-",
  emphasis: "*",
  strong: "*",
  listItemIndent: "one",
});

export function markdownToMdast(markdown: string) {
  return parser.parse(markdown);
}

export function mdastToMarkdown(tree: any): string {
  return serializer.stringify(tree);
}
