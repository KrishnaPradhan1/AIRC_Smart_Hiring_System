/**
 * textToResumeHTML.ts
 *
 * Converts raw extracted resume plain-text into structured HTML
 * suitable for TipTap's WYSIWYG editor.  This runs entirely
 * client-side — no AI call needed.
 *
 * Heuristics:
 *  - Lines that look like section headers (ALL CAPS, or contain
 *    common resume keywords) become <h2>.
 *  - Lines that start with bullet characters become <li>.
 *  - The very first non-empty line is treated as the candidate's name (<h1>).
 *  - Lines that look like contact info (email, phone, linkedin) are
 *    grouped under the name.
 */

const SECTION_KEYWORDS = [
    'summary', 'objective', 'experience', 'work experience', 'professional experience',
    'employment', 'education', 'skills', 'technical skills', 'certifications',
    'projects', 'achievements', 'awards', 'publications', 'languages',
    'interests', 'hobbies', 'references', 'volunteer', 'training',
    'coursework', 'professional summary', 'career objective', 'qualifications',
    'core competencies', 'key skills', 'profile', 'about me', 'contact',
];

const BULLET_RE = /^[\s]*[•●◦▪▸\-–—\*]\s*/;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /[\+]?[\d\s\-().]{7,}/;
const URL_RE = /https?:\/\/|linkedin\.com|github\.com/i;

function isSectionHeader(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // All-caps line with at least 3 alpha chars → likely a header
    const alphaOnly = trimmed.replace(/[^a-zA-Z]/g, '');
    if (alphaOnly.length >= 3 && trimmed === trimmed.toUpperCase()) return true;

    // Matches a known resume keyword
    const lower = trimmed.toLowerCase().replace(/[:\-–—]/g, '').trim();
    return SECTION_KEYWORDS.some(k => lower === k || lower.startsWith(k + ' '));
}

function isContactLine(line: string): boolean {
    const t = line.trim();
    if (!t) return false;
    return EMAIL_RE.test(t) || PHONE_RE.test(t) || URL_RE.test(t);
}

function isBullet(line: string): boolean {
    return BULLET_RE.test(line);
}

function stripBullet(line: string): string {
    return line.replace(BULLET_RE, '').trim();
}

export function textToResumeHTML(rawText: string): string {
    if (!rawText || !rawText.trim()) {
        return '<h1 style="text-align:center">YOUR NAME HERE</h1><p style="text-align:center">email@example.com | 555-555-5555</p>';
    }

    const lines = rawText.split(/\r?\n/);
    const parts: string[] = [];

    let foundName = false;
    let contactLines: string[] = [];
    let inBulletList = false;

    const closeBulletList = () => {
        if (inBulletList) {
            parts.push('</ul>');
            inBulletList = false;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip blank lines
        if (!trimmed) {
            // If we're collecting contact lines and hit a blank, flush them
            if (contactLines.length > 0) {
                parts.push(`<p style="text-align:center">${contactLines.join(' | ')}</p>`);
                contactLines = [];
            }
            closeBulletList();
            continue;
        }

        // First non-empty line = candidate name
        if (!foundName) {
            parts.push(`<h1 style="text-align:center">${trimmed}</h1>`);
            foundName = true;
            continue;
        }

        // Lines right after the name that look like contact info
        if (parts.length <= 2 && isContactLine(trimmed) && !isSectionHeader(trimmed)) {
            contactLines.push(trimmed);
            continue;
        }

        // Flush any pending contact lines
        if (contactLines.length > 0) {
            parts.push(`<p style="text-align:center">${contactLines.join(' | ')}</p>`);
            contactLines = [];
        }

        // Section header
        if (isSectionHeader(trimmed)) {
            closeBulletList();
            // Title-case the header
            const headerText = trimmed
                .toLowerCase()
                .replace(/(^|\s)\w/g, c => c.toUpperCase())
                .replace(/[:\-–—]+$/, '')
                .trim();
            parts.push(`<h2>${headerText}</h2>`);
            parts.push('<hr>');
            continue;
        }

        // Bullet point
        if (isBullet(line)) {
            if (!inBulletList) {
                parts.push('<ul>');
                inBulletList = true;
            }
            parts.push(`<li>${stripBullet(line)}</li>`);
            continue;
        }

        // Regular paragraph
        closeBulletList();
        parts.push(`<p>${trimmed}</p>`);
    }

    // Flush remaining
    if (contactLines.length > 0) {
        parts.push(`<p style="text-align:center">${contactLines.join(' | ')}</p>`);
    }
    closeBulletList();

    return parts.join('\n');
}
