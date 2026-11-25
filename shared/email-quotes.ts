// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { decodeHTML } from "entities";
import { formatQuotedDate } from "./dates";

/**
 * Escape all five OWASP-recommended HTML special characters in plain text.
 * Safe for use in both text content and attribute contexts.
 */
export function escapeHtml(text: string): string {
	if (!text) return "";
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function removeStyleAndScriptBlocks(html: string): string {
	return html
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
}

export function quotedBodyText(html: string): string {
	const text = removeStyleAndScriptBlocks(html)
		.replace(/<br\b[^>]*>|<\/(?:p|div|li)\s*>/gi, "\n")
		.replace(/<[^>]+>/g, "");
	return decodeHTML(text)
		.replace(/\r\n?/g, "\n")
		.replace(/\n(?:[^\S\n]*\n)+/g, "\n\n")
		.trim();
}

export const citationStyle = "margin:0 0 0 .8ex;border-left:1px #ccc solid;padding-left:1ex";

function quoteHtml(attributionHtml: string, plainBody: string): string {
	const body = escapeHtml(plainBody).replace(/\n/g, "<br>");
	return `<br><div class="gmail_quote"><div dir="ltr" class="gmail_attr">${attributionHtml}<br></div><blockquote class="gmail_quote" type="cite" style="${citationStyle}">${body}</blockquote></div>`;
}

interface OriginalMessage {
	date?: string;
	sender?: string;
	body?: string | null;
}

export function buildReplyQuote(original: OriginalMessage): { html: string; text: string } {
	if (!original.body) return { html: "", text: "" };
	const attribution = `On ${formatQuotedDate(original.date)}, ${original.sender || "unknown"} wrote:`;
	const body = quotedBodyText(original.body);
	return {
		html: quoteHtml(escapeHtml(attribution), body),
		text: `${attribution}\n${body.replace(/^/gm, "> ")}`,
	};
}

export function buildQuotedReplyBlock(original: OriginalMessage): string {
	return buildReplyQuote(original).html;
}

export function buildForwardQuote(original: OriginalMessage & { subject: string }): string {
	const sender = escapeHtml(original.sender || "");
	const date = escapeHtml(formatQuotedDate(original.date));
	const subject = escapeHtml(original.subject);
	const attribution = `<strong>Forwarded message:</strong><br><strong>From:</strong> ${sender}<br><strong>Date:</strong> ${date}<br><strong>Subject:</strong> ${subject}`;
	return quoteHtml(attribution, quotedBodyText(original.body || ""));
}
