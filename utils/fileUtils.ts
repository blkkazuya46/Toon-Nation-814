
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // result is "data:mime/type;base64,the_base_64_string"
        // we want to remove the prefix
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to read file as base64 string.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to read blob as base64 string.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const resizeImage = (file: File | Blob, maxSize: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            if (!event.target?.result) {
                return reject(new Error("Couldn't read file."));
            }
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxSize) {
                        height = Math.round((height * maxSize) / width);
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, 'image/jpeg', 0.9);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const applyAdjustments = (
  base64Image: string,
  adjustments: { rotation: number; brightness: number; contrast: number; saturation: number }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `data:image/png;base64,${base64Image}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      const { rotation, brightness, contrast, saturation } = adjustments;

      const rads = (rotation * Math.PI) / 180;
      const isSideways = rotation === 90 || rotation === 270;

      const originalWidth = img.width;
      const originalHeight = img.height;

      canvas.width = isSideways ? originalHeight : originalWidth;
      canvas.height = isSideways ? originalWidth : originalHeight;
      
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rads);
      
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

      ctx.drawImage(img, -originalWidth / 2, -originalHeight / 2, originalWidth, originalHeight);

      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };
    img.onerror = (error) => reject(new Error(`Failed to load image for editing: ${error}`));
  });
};

export const cropImage = (
  base64Image: string,
  cropRect: { x: number; y: number; width: number; height: number; }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64Image}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropRect.width;
      canvas.height = cropRect.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(
        img,
        cropRect.x,
        cropRect.y,
        cropRect.width,
        cropRect.height,
        0,
        0,
        cropRect.width,
        cropRect.height
      );
      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };
    img.onerror = (error) => reject(new Error(`Failed to load image for cropping: ${error}`));
  });
};

export const applyFilter = (
  base64Image: string,
  filter: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `data:image/png;base64,${base64Image}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      canvas.width = img.width;
      canvas.height = img.height;
      
      if (filter !== 'none') {
        ctx.filter = filter;
      }

      ctx.drawImage(img, 0, 0, img.width, img.height);

      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };
    img.onerror = (error) => reject(new Error(`Failed to load image for filtering: ${error}`));
  });
};
