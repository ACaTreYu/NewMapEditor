import { useEffect, useState } from 'react';
import './EditorStatsBadge.css';

const ENDPOINT = '/editor-stats.php';

export function EditorStatsBadge() {
  const [visitorText, setVisitorText] = useState('');
  const [mapsText, setMapsText] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const counted = sessionStorage.getItem('editor-visited');
    const fetchInit = counted ? fetch(ENDPOINT) : fetch(`${ENDPOINT}?action=visit`);

    fetchInit
      .then(r => r.json())
      .then(d => {
        const num = counted ? d.visitors : d.visitor_number;
        setVisitorText(`visitor #${num}`);
        setMapsText(`${d.maps_created} maps`);
        setLoaded(true);
        if (!counted) sessionStorage.setItem('editor-visited', '1');
      })
      .catch(() => {});

    const trackSave = (name: string, blob: Blob | null) => {
      fetch(`${ENDPOINT}?action=map-save&name=${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(d => setMapsText(`${d.maps_created} maps`))
        .catch(() => {});
      if (blob) {
        const fd = new FormData();
        fd.append('map', blob, name);
        fd.append('name', name);
        fetch('/save-map.php', { method: 'POST', body: fd }).catch(() => {});
      }
    };

    const origCreateWritable = (window as any).FileSystemFileHandle?.prototype?.createWritable;
    if (origCreateWritable) {
      (window as any).FileSystemFileHandle.prototype.createWritable = function () {
        const handle = this;
        return origCreateWritable.apply(this, arguments as any).then((writable: any) => {
          let capturedData: any = null;
          const origWrite = writable.write;
          writable.write = function (data: any) {
            capturedData = data;
            return origWrite.apply(writable, arguments as any);
          };
          const origClose = writable.close;
          writable.close = function () {
            const result = origClose.apply(writable, arguments as any);
            const name = handle.name || 'untitled.map';
            const blob = capturedData instanceof Blob ? capturedData : new Blob([capturedData]);
            trackSave(name, blob);
            return result;
          };
          return writable;
        });
      };
    }

    const origCreateObjectURL = URL.createObjectURL;
    const blobMap: Record<string, Blob> = {};
    URL.createObjectURL = function (obj: any) {
      const url = origCreateObjectURL.apply(this, arguments as any);
      if (obj instanceof Blob) blobMap[url] = obj;
      return url;
    };
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download && this.href) {
        const blob = blobMap[this.href] || null;
        trackSave(this.download, blob);
      }
      return origClick.apply(this, arguments as any);
    };
  }, []);

  if (!loaded) return null;

  return (
    <div className="editor-stats-badge">
      <span className="stats-visitor">{visitorText}</span>
      <span className="stats-sep">&middot;</span>
      <span className="stats-maps">{mapsText}</span>
    </div>
  );
}
