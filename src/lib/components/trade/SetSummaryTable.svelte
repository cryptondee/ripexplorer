<script lang="ts">
  // Generic, reusable summary table component
  export let title: string = '';
  export let rows: Array<Record<string, any>> = [];
  export let columns: Array<{
    key: string;
    header: string;
    align?: 'left' | 'center' | 'right';
    formatter?: (row: Record<string, any>) => string;
  }> = [];
</script>

<div class="w-full">
  {#if title}
    <h3 class="text-base font-semibold text-gray-900 mb-2">{title}</h3>
  {/if}

  <div class="overflow-x-auto rounded border border-gray-200">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          {#each columns as col}
            <th class="px-4 py-2 text-sm font-medium text-gray-700 whitespace-nowrap {col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}">
              {col.header}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        {#if rows && rows.length}
          {#each rows as row}
            <tr class="hover:bg-gray-50">
              {#each columns as col}
                <td class="px-4 py-2 text-sm text-gray-900 whitespace-nowrap {col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}">
                  {#if col.formatter}
                    {col.formatter(row)}
                  {:else}
                    {row[col.key]}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        {:else}
          <tr>
            <td class="px-4 py-6 text-sm text-gray-500 text-center" colspan={columns.length}>No data</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
