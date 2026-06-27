export async function saveFile(content, suggestedName, fileDescription, acceptMap) {
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: suggestedName,
        types: [{
          description: fileDescription,
          accept: acceptMap
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (e) {
      if (e.name === 'AbortError') {
        return false; // User cancelled
      }
      console.warn("showSaveFilePicker failed, falling back:", e);
    }
  }

  // Fallback: Standard browser download
  const mimeType = Object.keys(acceptMap)[0] || 'text/plain';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
