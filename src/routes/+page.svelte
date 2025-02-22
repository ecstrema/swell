<script lang="ts">
  import * as Resizable from "$lib/components/ui/resizable/index.js";
  import SignalsTree from "$lib/components/Tree/SignalsTree/SignalsTree.svelte";
  import ItemsTree from "$lib/components/Tree/InfoTree/ItemsTree.svelte";

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
