/**
 * Crops a region from a base64 image string based on normalized coordinates (0-1000).
 * 
 * @param base64Image The source image in base64 format.
 * @param box The bounding box [ymin, xmin, ymax, xmax] on a 0-1000 scale.
 * @returns A promise resolving to the cropped image as a base64 string.
 */
export const cropImageFromBase64 = (
    base64Image: string,
    box: [number, number, number, number]
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                // Ensure coordinates are numbers (API might return strings)
                const ymin = Number(box[0]);
                const xmin = Number(box[1]);
                const ymax = Number(box[2]);
                const xmax = Number(box[3]);

                // Validate coordinates logic
                if (isNaN(ymin) || isNaN(xmin) || isNaN(ymax) || isNaN(xmax) || ymin >= ymax || xmin >= xmax) {
                     console.warn("Invalid bounding box coordinates", box);
                     resolve(""); // Return empty string on failure, don't crash
                     return;
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                // Convert 1000-scale coordinates to pixel coordinates
                const pixelY = (ymin / 1000) * img.height;
                const pixelX = (xmin / 1000) * img.width;
                const pixelHeight = ((ymax - ymin) / 1000) * img.height;
                const pixelWidth = ((xmax - xmin) / 1000) * img.width;

                // Add a small padding (margin) to the crop, but clamp to image bounds
                const padding = 10; 
                const safeX = Math.max(0, pixelX - padding);
                const safeY = Math.max(0, pixelY - padding);
                
                // Ensure width/height don't exceed image dimensions
                const safeW = Math.min(img.width - safeX, pixelWidth + (padding * 2));
                const safeH = Math.min(img.height - safeY, pixelHeight + (padding * 2));

                canvas.width = safeW;
                canvas.height = safeH;

                // Draw the cropped portion
                ctx.drawImage(
                    img,
                    safeX, safeY, safeW, safeH, // Source
                    0, 0, safeW, safeH          // Destination
                );

                // High quality JPEG export
                const croppedBase64 = canvas.toDataURL('image/jpeg', 0.95);
                resolve(croppedBase64);
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = (err) => reject(err);
        img.src = base64Image;
    });
};