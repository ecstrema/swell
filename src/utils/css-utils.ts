export function css(content: string): CSSStyleSheet {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(content);
    return sheet;
}
