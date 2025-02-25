<script lang="ts">
import ItemsTree from '$lib/components/Tree/InfoTree/InfoTree.svelte';
import SignalsTree from '$lib/components/Tree/SignalsTree/SignalsTree.svelte';
import * as Resizable from '$lib/components/ui/resizable/index.js';
</script>

<Resizable.PaneGroup autoSaveId="swell" direction="horizontal" class="h-full">
  <Resizable.Pane defaultSize={30} class="min-w-32">
    <ItemsTree />
  </Resizable.Pane>

  <Resizable.Handle withHandle={true} />

  <Resizable.Pane>
    <SignalsTree />
  </Resizable.Pane>
</Resizable.PaneGroup>
