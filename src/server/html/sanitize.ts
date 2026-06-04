import sanitizeHtmlLib from "sanitize-html";

/**
 * Server-side HTML sanitisation for template and landing-page bodies.
 *
 * Applied both before storing admin-authored HTML and before rendering it, so a
 * `<script>`, `onerror=`, `javascript:` URL, etc. can never reach a browser
 * (XSS defence — docs/security.md §2). We use `sanitize-html` (a pure-JS,
 * parser-based sanitiser) rather than a DOM-based one: it needs no `jsdom`,
 * which keeps the server build clean and the dependency light. See DECISIONS.md.
 *
 * Script/style/iframe/object/embed/form/input are dropped entirely; only a safe
 * tag and attribute set survives. A `{{trackingLink}}` placeholder in an href is
 * preserved (it is a relative-looking value, not a disallowed scheme) so the
 * tracking link is not stripped before personalisation replaces it at send time.
 */
const OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: [
    "p", "br", "hr", "div", "span", "a", "strong", "b", "em", "i", "u",
    "ul", "ol", "li", "blockquote", "pre", "code",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "img", "table", "thead", "tbody", "tr", "td", "th", "center", "font",
  ],
  allowedAttributes: {
    "*": ["style", "class", "align", "width", "height", "dir", "title"],
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    font: ["color", "face", "size"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: true,
  // Keep `style` attributes but disallow CSS that can execute or load resources.
  allowedStyles: {
    "*": {
      color: [/.*/],
      "background-color": [/.*/],
      "text-align": [/.*/],
      "font-size": [/.*/],
      "font-weight": [/.*/],
      padding: [/.*/],
      margin: [/.*/],
      border: [/.*/],
    },
  },
};

export function sanitizeHtml(dirty: string): string {
  return sanitizeHtmlLib(dirty, OPTIONS);
}
