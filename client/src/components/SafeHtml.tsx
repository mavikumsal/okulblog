import React from "react";
import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li",
  "h2", "h3", "h4", "blockquote", "pre", "code", "a", "span",
];
const ALLOWED_ATTR = ["href", "target", "rel", "class"];

export function sanitizeRichText(value: string) {
  return DOMPurify.sanitize(value || "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_ATTR: ["style", "onerror", "onclick", "onload"],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target", "rel"],
  });
}

export function SafeHtml({ html, className = "" }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />;
}
