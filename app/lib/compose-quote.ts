// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Node } from "@tiptap/react";
import { citationStyle } from "shared/email-quotes";

export const MailQuote = Node.create({
	name: "mailQuote",
	group: "block",
	content: "block+",
	parseHTML: () => [{ tag: "div.gmail_quote" }],
	renderHTML: () => ["div", { class: "gmail_quote" }, 0],

	addGlobalAttributes() {
		return [{
			types: ["blockquote"],
			attributes: {
				mailCitation: {
					default: false,
					parseHTML: (element) => element.matches('blockquote.gmail_quote[type="cite"]'),
					renderHTML: ({ mailCitation }) => mailCitation
						? { class: "gmail_quote", type: "cite", style: citationStyle }
						: {},
				},
			},
		}];
	},
});

export const MailAttribution = Node.create({
	name: "mailAttribution",
	group: "block",
	content: "inline*",
	parseHTML: () => [{ tag: "div.gmail_attr" }],
	renderHTML: () => ["div", { dir: "ltr", class: "gmail_attr" }, 0],
});
