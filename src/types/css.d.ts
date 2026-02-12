declare module "*.css" {
    const sheet: CSSStyleSheet;
    export default sheet;
}

declare module "*.css?inline" {
    const content: string;
    export default content;
}
