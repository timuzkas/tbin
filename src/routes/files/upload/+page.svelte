<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let files: FileList;
  let uploadedFileIds: string[] = [];
  let uploadedCollectionId: string | null = null;
  let loading = false;
  let token: string | null = null;

  const MAX_FILE_SIZE_ANON = 10 * 1024 * 1024; // 10MB for anonymous users
  const MAX_FILE_SIZE_AUTHED = 25 * 1024 * 1024; // 25MB for authenticated users

  onMount(() => {
    token = localStorage.getItem('token');
  });

  async function uploadFiles() {
    if (!files || files.length === 0) {
      alert('Please select files to upload.');
      return;
    }

    loading = true;
    uploadedFileIds = [];
    uploadedCollectionId = null;

    const isAuthed = !!token;
    const maxAllowedSize = isAuthed ? MAX_FILE_SIZE_AUTHED : MAX_FILE_SIZE_ANON;

    const uploadPromises = Array.from(files).map(async (file) => {
      if (file.size > maxAllowedSize) {
        let message = `File "${file.name}" is too large. Max size for ${isAuthed ? 'authenticated' : 'anonymous'} users is ${(maxAllowedSize / (1024 * 1024)).toFixed(0)}MB.`;
        if (!isAuthed) {
          message += ' (For authenticated users, the limit is 25MB)';
        }
        alert(message);
        return null;
      }

      const formData = new FormData();
      formData.append('file', file);

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return data.id;
      } else {
        const errorText = await res.text();
        alert(`Failed to upload "${file.name}": ${errorText}`);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    uploadedFileIds = results.filter((id) => id !== null) as string[];

    if (uploadedFileIds.length > 0) {
      // Create a collection for all uploaded files
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const collectionRes = await fetch('/api/files/create-collection', {
        method: 'POST',
        headers,
        body: JSON.stringify({ file_ids: uploadedFileIds }),
      });

      if (collectionRes.ok) {
        const collectionData = await collectionRes.json();
        uploadedCollectionId = collectionData.collection_id;
      } else {
        const collectionError = await collectionRes.text();
        alert(`Failed to create collection: ${collectionError}`);
      }
    } else {
      alert('No files were successfully uploaded to create a collection.');
    }

    loading = false;
  }

  function copyCollectionURL() {
    if (uploadedCollectionId) {
      navigator.clipboard.writeText(`${window.location.origin}/files/${uploadedCollectionId}`);
    }
  }

  const viewCollection = () => {
    if (uploadedCollectionId) {
      goto(`/files/${uploadedCollectionId}`);
    }
  };
</script>

<svelte:head>
  <title>Upload File</title>
</svelte:head>

<main class="mx-auto max-w-2xl space-y-6 p-6">
  <a href="/" class="mb-4 block text-3xl text-accent hover:cursor-pointer hover:underline">
    > Upload File
  </a>

  <div class="space-y-4 rounded-lg border border-text p-4">
    <input type="file" bind:files multiple class="hover:cursor-pointer hover:text-neutral-200" />
    <button on:click={uploadFiles} disabled={loading} class="px-4 py-2">
      {loading ? 'Uploading...' : 'Upload Files'}
    </button>
  </div>

  {#if uploadedCollectionId}
    <p>Files uploaded successfully!</p>
    <p>Collection ID: <span class="text-accent">{uploadedCollectionId}</span></p>
    <div class="flex gap-5">
      <button
        on:click={viewCollection}
        class="bg-accent px-4 py-2 text-black hover:cursor-pointer hover:bg-accent/70"
      >
        view
      </button>
      <button
        on:click={copyCollectionURL}
        class="px-4 py-2 hover:cursor-pointer hover:text-accent hover:underline"
      >
        copy URL
      </button>
    </div>
  {/if}
</main>
