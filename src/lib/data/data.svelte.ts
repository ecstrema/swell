export class TreeItem {
	selected = $state(false);
	constructor(public name: string) {}

	toggleSelected = () => {
		this.selected = !this.selected;
	};
}

export class GroupTreeItem extends TreeItem {
	type = "group" as const;
	children: TreeItems[] = $state([]);
	expanded = $state(true);

	constructor(name: string, children: TreeItems[] = []) {
		super(name);
		this.children = children;
	}
}

export type ValueChange = [number, number];

export class SignalTreeItem extends TreeItem {
	type = "signal" as const;

	static baseColors = [
		"red",
		"green",
		"blue",
		"yellow",
		"purple",
		"orange",
		"cyan",
		"magenta",
	];

	color = $state(
		SignalTreeItem.baseColors[
			Math.floor(Math.random() * SignalTreeItem.baseColors.length)
		],
	);

	*clock(
		start: number,
		width: number,
		period = 1,
		// The clock starts low at time clockStart, and is high for dutyCycle * period
		clockStart = 0,
		dutyCycle = 0.5,
	): Generator<ValueChange> {
		// yield all from before the startTime to after the endTime
		const previousChangeTime = start - ((start - clockStart) % period);
		const end = start + width + period; // Add one period to ensure we get the last change
		const lowPeriod = (1 - dutyCycle) * period;
		for (let time = previousChangeTime; time < end; time += period) {
			yield [time, 0];
			yield [time + lowPeriod, 1];
		}
	}

	// Takes an existing generator, and returns pairs of values lie [0, 1], [1, 2], [2, 3] etc
	static *pairGenerator<T>(generator: Generator<T>): Generator<[T, T]> {
		let lastValue = generator.next();
		let nextValue = generator.next();

		while (!lastValue.done && !nextValue.done) {
			yield [lastValue.value, nextValue.value];
			lastValue = nextValue;
			nextValue = generator.next();
		}
	}

	*getChanges(start: number, width: number): Generator<ValueChange> {
		// TODO: get actual changes from wellen
		yield* this.clock(start, width);
	}

	*getChangePairs(
		start: number,
		width: number,
	): Generator<[ValueChange, ValueChange]> {
		yield* SignalTreeItem.pairGenerator(this.getChanges(start, width));
	}
}

export type TreeItems = GroupTreeItem | SignalTreeItem;

export const root = $state(
	new GroupTreeItem("root", [
		new GroupTreeItem("signal1", [new SignalTreeItem("signal1.1")]),
		new SignalTreeItem("signal2"),
	]),
);
