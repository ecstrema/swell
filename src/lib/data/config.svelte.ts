export class Config {
	itemHeight = $state(26);
	itemPadding = $state(4);
	stripesItemCount = $state(1);
	treeFontSize = $state(16);
	treeIndent = $state(12);
	lineWidth = $state(1);

	timeUnit = $state<"min" | "s" | "ms" | "us" | "ns" | "fs">("ns");

	viewStart = $state(0);
	viewWidth = $state(100);
	get viewEnd() {
		return this.viewStart + this.viewWidth;
	}
}

export const config = new Config();
