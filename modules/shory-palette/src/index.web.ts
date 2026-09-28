// Same contract as native, through a canvas. A cross-origin image without CORS headers can't be
// read, so it yields no pixels (and so no palette) instead of failing.
export function samplePixels(uri: string, size: number): Promise<number[]> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onerror = () => resolve([]);
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) return resolve([]);
        context.drawImage(image, 0, 0, size, size);
        const { data } = context.getImageData(0, 0, size, size);
        const colors: number[] = [];
        for (let offset = 0; offset < data.length; offset += 4) {
          if (data[offset + 3] > 200)
            colors.push((data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2]);
        }
        resolve(colors);
      } catch {
        resolve([]);
      }
    };
    image.src = uri;
  });
}
